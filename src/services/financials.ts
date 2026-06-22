import { Project, GRN, PurchaseOrder, Product, ProjectReturn } from '@/types';
import { collection, addDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ProjectFinancials {
  projectId: string;
  projectName: string;
  budget: number | string; // If budget is 0, is "Budget Not Defined"
  spent: number;
  remaining: number;
  utilization: number; // percentage (integer)
  utilizationPercentage: number; // numeric percentage, handles 0/limit
  statusText: string;  // "0–60%" | "61–85%" | "Above 85%"
  isBudgetDefined: boolean;
}

export interface FinancialModule {
  name: string;
  calculate: (projectId: string, context: {
    grns: GRN[];
    pos: PurchaseOrder[];
    products: Product[];
    projectReturns: ProjectReturn[];
  }) => number;
}

// 1. Core Material Purchases Module (Calculated from Approved GRNs)
export const GRN_EXPENSE_MODULE: FinancialModule = {
  name: 'Material Purchases via Approved GRNs',
  calculate: (projectId, { grns, pos, products }) => {
    // Only Approved GRNs of this project
    const approvedGrns = grns.filter(
      g => g.projectId === projectId && g.status === 'APPROVED'
    );
    
    let total = 0;
    for (const grn of approvedGrns) {
      if (!grn.items || !Array.isArray(grn.items)) continue;
      
      for (const item of grn.items) {
        let unitPrice: number | null = null;
        
        // Step A: Search for the product's unit price in the associated PO
        if (grn.poId && grn.poId !== 'MANUAL') {
          const po = pos.find(p => p.id === grn.poId);
          if (po && po.items) {
            const poItem = po.items.find(pi => pi.productId === item.productId);
            if (poItem && typeof poItem.unitPrice === 'number') {
              unitPrice = poItem.unitPrice;
            }
          }
        }
        
        // Step B: Search for unit price in the Products collection
        if (unitPrice === null) {
          const product = products.find(p => p.id === item.productId);
          if (product && typeof product.unitPrice === 'number') {
            unitPrice = product.unitPrice;
          }
        }
        
        const finalPrice = unitPrice ?? 0;
        total += (item.receivedQuantity || 0) * finalPrice;
      }
    }
    return total;
  }
};

// 2. Core Material Returns Module (Deducted from Spent)
export const RETURN_CREDIT_MODULE: FinancialModule = {
  name: 'Material Returns Credit',
  calculate: (projectId, { projectReturns, products }) => {
    // Only Approved or Returned project returns of this project
    const approvedReturns = projectReturns.filter(
      r => r.projectId === projectId && (r.status === 'APPROVED' || r.status === 'RETURNED')
    );
    
    let totalCredit = 0;
    for (const r of approvedReturns) {
      const qty = r.approvedQuantity !== undefined && r.approvedQuantity !== null ? r.approvedQuantity : r.returnQuantity;
      const product = products.find(p => p.id === r.productId);
      const unitPrice = product?.unitPrice ?? 0;
      totalCredit += (qty || 0) * unitPrice;
    }
    return totalCredit;
  }
};

// 3. Extensible Future Expenses/Credits Placeholders
export const TRANSPORT_EXPENSE_MODULE: FinancialModule = {
  name: 'Transportation Charges',
  calculate: () => 0 // Future extension
};

export const LABOUR_EXPENSE_MODULE: FinancialModule = {
  name: 'Labour Cost',
  calculate: () => 0 // Future extension
};

export const EQUIPMENT_EXPENSE_MODULE: FinancialModule = {
  name: 'Equipment Rental',
  calculate: () => 0 // Future extension
};

export const SITE_EXPENSE_MODULE: FinancialModule = {
  name: 'Site Expenses',
  calculate: () => 0 // Future extension
};

export const TAXES_EXPENSE_MODULE: FinancialModule = {
  name: 'Taxes',
  calculate: () => 0 // Future extension
};

export const MISC_EXPENSE_MODULE: FinancialModule = {
  name: 'Miscellaneous Expenses',
  calculate: () => 0 // Future extension
};

// All financial calculation modules registry
const EXPENSE_MODULES: FinancialModule[] = [
  GRN_EXPENSE_MODULE,
  TRANSPORT_EXPENSE_MODULE,
  LABOUR_EXPENSE_MODULE,
  EQUIPMENT_EXPENSE_MODULE,
  SITE_EXPENSE_MODULE,
  TAXES_EXPENSE_MODULE,
  MISC_EXPENSE_MODULE
];

const CREDIT_MODULES: FinancialModule[] = [
  RETURN_CREDIT_MODULE
];

/**
 * Calculates project financials using the live Firestore context state.
 * This is the SINGLE SOURCE OF TRUTH for all financial computations in the app.
 */
export function computeProjectFinancials(
  project: Project,
  grns: GRN[],
  pos: PurchaseOrder[],
  products: Product[],
  projectReturns: ProjectReturn[]
): ProjectFinancials {
  const context = { grns, pos, products, projectReturns };
  
  // Sum up all expenses
  let totalExpenses = 0;
  for (const module of EXPENSE_MODULES) {
    totalExpenses += module.calculate(project.id, context);
  }
  
  // Sum up all return credits
  let totalCredits = 0;
  for (const module of CREDIT_MODULES) {
    totalCredits += module.calculate(project.id, context);
  }
  
  // Spent cannot go below zero
  const spent = Math.max(0, totalExpenses - totalCredits);
  const budget = project.budget || 0;
  
  // Remaining Budget: No upper limits / clamp below zero unless budget is explicitly allowed to overrun
  const remaining = budget - spent;
  
  const isBudgetDefined = budget > 0;
  let utilization = 0;
  if (isBudgetDefined) {
    utilization = Math.round((spent / budget) * 100);
  }
  
  let statusText = '0–60%';
  if (utilization > 85) {
    statusText = 'Above 85%';
  } else if (utilization > 60) {
    statusText = '61–85%';
  }
  
  return {
    projectId: project.id,
    projectName: project.name,
    budget: isBudgetDefined ? budget : 'Budget Not Defined',
    spent,
    remaining,
    utilization,
    utilizationPercentage: isBudgetDefined ? utilization : 0,
    statusText,
    isBudgetDefined
  };
}

/**
 * Writes an audit trail record for a financial change in the auditLogs collection.
 */
export async function writeFinancialAuditLog(log: {
  projectId: string;
  transactionType: 'GRN_APPROVED' | 'GRN_CANCELLED' | 'RETURN_APPROVED' | 'RETURN_PROCESSED' | 'PROJECT_BUDGET_UPDATED';
  grnNumber?: string | null;
  returnNumber?: string | null;
  prevSpentAmount: number;
  newSpentAmount: number;
  changedBy: string;
  changedByName?: string;
  notes?: string;
}) {
  try {
    const auditLogsCol = collection(db, 'auditLogs');
    await addDoc(auditLogsCol, {
      type: 'FINANCIAL_AUDIT',
      projectId: log.projectId,
      transactionType: log.transactionType,
      grnNumber: log.grnNumber || null,
      returnNumber: log.returnNumber || null,
      prevSpentAmount: log.prevSpentAmount,
      newSpentAmount: log.newSpentAmount,
      diffAmount: Math.abs(log.newSpentAmount - log.prevSpentAmount),
      userId: log.changedBy,
      userName: log.changedByName || 'System',
      notes: log.notes || `Financial Change: ${log.transactionType}`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to write financial audit log:', err);
  }
}
