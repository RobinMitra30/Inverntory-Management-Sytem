import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { POService, MovementService, ProductService, ProjectService, VendorService, GRNService, InventoryService, PRService } from '@/services/store';
import { PurchaseOrder, StockMovement, Product, MovementType, Project, Vendor, GRN, Stock, PurchaseRequisition } from '@/types';
import { cn } from '@/lib/utils';
import { Download, Search, FileSpreadsheet, TrendingUp, ShoppingCart, Warehouse, AlertTriangle, FileText } from 'lucide-react';

const COLORS = ['#0f172a', '#ea580c', '#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function ReportsPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'30D'|'3M'|'6M'|'12M'>('6M');

  // Page level tabs
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'REPORTS'>('ANALYTICS');
  // 5 Spec-defined report types
  const [selectedReportType, setSelectedReportType] = useState<'MATERIAL_REQUIREMENT'|'PROCUREMENT'|'VENDOR_PROCUREMENT'|'WAREHOUSE_FULFILLMENT'|'SITE_CONSUMPTION'>('MATERIAL_REQUIREMENT');

  useEffect(() => {
    let isMounted = true;
    const unsubPO = POService.subscribe((data) => {
      if (isMounted) {
        setPos(projectIdParam ? data.filter(d => d.projectId === projectIdParam) : data);
      }
    });
    const unsubMovements = MovementService.subscribe((data) => {
      if (isMounted) {
        setMovements(projectIdParam ? data.filter(d => d.projectId === projectIdParam) : data);
      }
    });
    const unsubProducts = ProductService.subscribe((data) => {
      if (isMounted) {
        setProducts(data);
      }
    });
    const unsubProjects = ProjectService.subscribe((data) => {
      if (isMounted) {
        setProjects(data);
      }
    });
    const unsubVendors = VendorService.subscribe((data) => {
      if (isMounted) {
        setVendors(data);
      }
    });
    const unsubGrns = GRNService.subscribe((data) => {
      if (isMounted) {
        setGrns(projectIdParam ? data.filter(d => d.projectId === projectIdParam) : data);
      }
    });
    const unsubStocks = InventoryService.subscribe((data) => {
      if (isMounted) {
        setStocks(projectIdParam ? data.filter(d => d.projectId === projectIdParam) : data);
      }
    });
    const unsubPrs = PRService.subscribe((data) => {
      if (isMounted) {
        setPrs(projectIdParam ? data.filter(d => d.projectId === projectIdParam) : data);
      }
    });

    // Instead of synchronously setting loading false, wait for initial load if necessary, or do it on mount.
    // Setting it in timeout prevents the synchronous effect trigger warning
    setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 0);

    return () => {
      isMounted = false;
      unsubPO();
      unsubMovements();
      unsubProducts();
      unsubProjects();
      unsubVendors();
      unsubGrns();
      unsubStocks();
      unsubPrs();
    };
  }, [projectIdParam]);

  const { filteredPos, filteredMovements } = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);
    if (timeFilter === '30D') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === '3M') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (timeFilter === '6M') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (timeFilter === '12M') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    const fp = pos.filter(p => {
      if (!projectIdParam && selectedProject !== 'ALL' && p.projectId !== selectedProject) return false;
      return new Date(p.createdAt) >= startDate;
    });
    const fm = movements.filter(m => {
      if (!projectIdParam && selectedProject !== 'ALL' && m.projectId !== selectedProject) return false;
      return new Date(m.createdAt) >= startDate;
    });
    return { filteredPos: fp, filteredMovements: fm };
  }, [pos, movements, timeFilter, selectedProject, projectIdParam]);

  // 1. Material Trends Data Processing
  interface TrendBin {
    name: string;
    month?: number;
    year?: number;
    key?: string;
    received: number;
    consumed: number;
  }
  const trendsData = useMemo(() => {
    const now = new Date();
    const bins: TrendBin[] = [];
    
    if (timeFilter === '30D') {
       for(let i=29; i>=0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          bins.push({
             name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
             key: d.toISOString().split('T')[0],
             received: 0,
             consumed: 0
          });
       }
    } else {
       const monthsCount = timeFilter === '3M' ? 3 : timeFilter === '6M' ? 6 : 12;
       for (let i = monthsCount - 1; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         bins.push({
           name: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
           month: d.getMonth(),
           year: d.getFullYear(),
           received: 0,
           consumed: 0
         });
       }
    }

    filteredMovements.forEach(m => {
        const date = new Date(m.createdAt);
        const isInbound = (
          m.type === MovementType.IN || 
          m.type === MovementType.STOCK_IN || 
          m.type === MovementType.PURCHASE_ENTRY || 
          m.type === MovementType.GRN_ENTRY || 
          m.type === MovementType.RETURN_TO_STORE ||
          m.type === MovementType.RETURN_TO_WAREHOUSE ||
          m.type === MovementType.DAMAGED_RETURN ||
          m.type === MovementType.EXCESS_RETURN ||
          m.type === MovementType.PURCHASE_RECEIPT ||
          (m.type === MovementType.ISSUE_TO_SITE && m.quantity > 0) ||
          ((m.type === MovementType.ADJUSTMENT_ENTRY || m.type === MovementType.ADJUSTMENT) && m.quantity > 0)
        );
        const isOutbound = (
          m.type === MovementType.OUT || 
          m.type === MovementType.STOCK_OUT || 
          m.type === MovementType.MATERIAL_ISSUE || 
          m.type === MovementType.SITE_TRANSFER || 
          m.type === MovementType.RETURN_TO_VENDOR || 
          m.type === MovementType.DAMAGE_ENTRY || 
          m.type === MovementType.SCRAP_ENTRY || 
          m.type === MovementType.CONSUMPTION_ENTRY ||
          (m.type === MovementType.ISSUE_TO_SITE && m.quantity < 0) ||
          ((m.type === MovementType.ADJUSTMENT_ENTRY || m.type === MovementType.ADJUSTMENT) && m.quantity < 0)
        );

        if (timeFilter === '30D') {
            const key = date.toISOString().split('T')[0];
            const b = bins.find(b => b.key === key);
            if (b) {
                if (isInbound) b.received += Math.abs(m.quantity);
                else if (isOutbound) b.consumed += Math.abs(m.quantity);
            }
        } else {
            const mIdx = bins.findIndex(l => l.month === date.getMonth() && l.year === date.getFullYear());
            if (mIdx !== -1) {
              if (isInbound) bins[mIdx].received += Math.abs(m.quantity);
              else if (isOutbound) bins[mIdx].consumed += Math.abs(m.quantity);
            }
        }
    });

    return bins;
  }, [filteredMovements, timeFilter]);

  // 2. Category-wise Expenditure
  const expenditureData = useMemo(() => {
    const catMap: Record<string, number> = {};
    
    filteredPos.forEach(po => {
      if (po.status === 'REJECTED') return;
      
      po.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const category = product?.category || 'General';
        const itemTotal = item.quantityOrdered * item.unitPrice;
        catMap[category] = (catMap[category] || 0) + itemTotal;
      });
    });

    return Object.entries(catMap).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPos, products]);

  const totalExpenditure = useMemo(() => {
    return expenditureData.reduce((sum, item) => sum + item.value, 0);
  }, [expenditureData]);

  // 3. Inventory Turnover (Simplified as Received Value Trend)
  interface TurnoverBin {
    name: string;
    month?: number;
    year?: number;
    key?: string;
    value: number;
  }
  const turnoverData = useMemo(() => {
    const now = new Date();
    const bins: TurnoverBin[] = [];
    
    if (timeFilter === '30D') {
       for(let i=29; i>=0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          bins.push({
             name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
             key: d.toISOString().split('T')[0],
             value: 0
          });
       }
    } else {
       const monthsCount = timeFilter === '3M' ? 3 : timeFilter === '6M' ? 6 : 12;
       for (let i = monthsCount - 1; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         bins.push({
           name: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
           month: d.getMonth(),
           year: d.getFullYear(),
           value: 0
         });
       }
    }

    filteredPos.forEach(po => {
      if (po.status === 'REJECTED') return;
      const date = new Date(po.createdAt);

      if (timeFilter === '30D') {
          const key = date.toISOString().split('T')[0];
          const b = bins.find(b => b.key === key);
          if (b) {
              b.value += po.totalAmount;
          }
      } else {
          const mIdx = bins.findIndex(l => l.month === date.getMonth() && l.year === date.getFullYear());
          if (mIdx !== -1) {
            bins[mIdx].value += po.totalAmount;
          }
      }
    });

    return bins;
  }, [filteredPos, timeFilter]);

  // ==========================================
  // SPECIFIC SPECIFICATIONS DEFINED REPORTS
  // ==========================================

  // 1. Material Requirement Report Data
  const materialRequirementsReport = useMemo(() => {
    return products.map(prod => {
      const productStocks = stocks.filter(s => s.productId === prod.id);
      const physicalStock = productStocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
      const reservedStock = productStocks.reduce((sum, s) => sum + (s.reservedQuantity || 0), 0);
      const incomingStock = productStocks.reduce((sum, s) => sum + (s.incomingQuantity || 0), 0);
      const requiredToRefill = Math.max(0, prod.minStockLevel - physicalStock);

      let status: 'NO_STOCK' | 'LOW_STOCK' | 'IN_STOCK' = 'IN_STOCK';
      if (physicalStock === 0) status = 'NO_STOCK';
      else if (physicalStock < prod.minStockLevel) status = 'LOW_STOCK';

      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        minStock: prod.minStockLevel,
        physical: physicalStock,
        reserved: reservedStock,
        incoming: incomingStock,
        requiredQty: requiredToRefill,
        status,
        unit: prod.unit || 'Units'
      };
    });
  }, [products, stocks]);

  // 2. Procurement Report Data
  const procurementReport = useMemo(() => {
    const totalPRs = prs.length;
    const pendingPR = prs.filter(pr => pr.status === 'PENDING_APPROVAL').length;
    const approvedPR = prs.filter(pr => pr.status === 'APPROVED' || pr.status === 'CONVERTED_TO_PO').length;
    const rejectedPR = prs.filter(pr => pr.status === 'REJECTED').length;

    const totalPOs = pos.length;
    const approvedPOs = pos.filter(po => po.status === 'APPROVED' || po.status === 'SHIPPED' || po.status === 'PARTIAL_RECEIVED' || po.status === 'RECEIVED').length;
    const completedPOs = pos.filter(po => po.status === 'RECEIVED' || po.status === 'CLOSED').length;
    const openPOsValue = pos.filter(po => po.status !== 'REJECTED' && po.status !== 'CLOSED' && po.status !== 'RECEIVED' && po.status !== 'DRAFT').reduce((sum, p) => sum + p.totalAmount, 0);
    const totalSpent = pos.filter(po => po.status !== 'REJECTED').reduce((sum, p) => sum + p.totalAmount, 0);

    const detailedItemsList: Array<{
      id: string;
      itemCode: string;
      poNumber: string;
      itemName: string;
      qtyOrdered: number;
      price: number;
      vendorName: string;
      projectName: string;
      status: string;
      createdAt: string;
    }> = [];

    pos.forEach(po => {
      const vendor = vendors.find(v => v.id === po.vendorId);
      const project = projects.find(p => p.id === po.projectId);
      po.items.forEach(item => {
        detailedItemsList.push({
          id: `${po.id}-${item.productId}`,
          itemCode: po.id.slice(-6).toUpperCase(),
          poNumber: po.poNumber || 'N/A',
          itemName: item.productName || 'Unknown SKU',
          qtyOrdered: item.quantityOrdered,
          price: item.unitPrice,
          vendorName: vendor?.name || 'Unknown Vendor',
          projectName: project?.name || 'Global Shared',
          status: po.status,
          createdAt: po.createdAt
        });
      });
    });

    return {
      metrics: {
        totalPRs,
        pendingPR,
        approvedPR,
        rejectedPR,
        totalPOs,
        approvedPOs,
        completedPOs,
        openPOsValue,
        totalSpent
      },
      detailedItemsList
    };
  }, [prs, pos, vendors, projects]);

  // 3. Vendor Procurement Report Data
  const vendorProcurementReport = useMemo(() => {
    return vendors.map(vendor => {
      const vendorPOs = pos.filter(po => po.vendorId === vendor.id);
      const totalOrdersCount = vendorPOs.length;
      const spentAmount = vendorPOs.filter(po => po.status !== 'REJECTED').reduce((sum, po) => sum + po.totalAmount, 0);
      const activePending = vendorPOs.filter(po => po.status === 'APPROVED' || po.status === 'SHIPPED' || po.status === 'PARTIAL_RECEIVED').length;

      // Group unique items ordered from this vendor
      const uniqueProductIds = new Set<string>();
      vendorPOs.forEach(po => po.items.forEach(item => uniqueProductIds.add(item.productId)));

      return {
        id: vendor.id,
        name: vendor.name,
        contact: vendor.contactPerson || vendor.email || 'N/A',
        ordersCount: totalOrdersCount,
        spent: spentAmount,
        activeOrders: activePending,
        uniqueItemCount: uniqueProductIds.size,
        outstandingDue: activePending > 0 ? spentAmount * 0.4 : 0
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [vendors, pos]);

  // 4. Warehouse Fulfillment Report Data
  const warehouseFulfillmentReport = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    const dailyDataMap: Record<string, { date: string; inbound: number; outbound: number }> = {};

    filteredMovements.forEach(m => {
      const dateStr = new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!dailyDataMap[dateStr]) {
        dailyDataMap[dateStr] = { date: dateStr, inbound: 0, outbound: 0 };
      }

      const isInbound = (
        m.type === MovementType.IN || 
        m.type === MovementType.STOCK_IN || 
        m.type === MovementType.PURCHASE_ENTRY || 
        m.type === MovementType.GRN_ENTRY || 
        m.type === MovementType.RETURN_TO_STORE ||
        m.type === MovementType.RETURN_TO_WAREHOUSE ||
        m.type === MovementType.DAMAGED_RETURN ||
        m.type === MovementType.EXCESS_RETURN ||
        m.type === MovementType.PURCHASE_RECEIPT ||
        (m.type === MovementType.ISSUE_TO_SITE && m.quantity > 0)
      );
      const isOutbound = (
        m.type === MovementType.OUT || 
        m.type === MovementType.STOCK_OUT || 
        m.type === MovementType.MATERIAL_ISSUE || 
        m.type === MovementType.SITE_TRANSFER || 
        m.type === MovementType.RETURN_TO_VENDOR || 
        m.type === MovementType.CONSUMPTION_ENTRY ||
        (m.type === MovementType.ISSUE_TO_SITE && m.quantity < 0)
      );

      if (isInbound) {
        totalInflow += Math.abs(m.quantity);
        dailyDataMap[dateStr].inbound += Math.abs(m.quantity);
      } else if (isOutbound) {
        totalOutflow += Math.abs(m.quantity);
        dailyDataMap[dateStr].outbound += Math.abs(m.quantity);
      }
    });

    const dailyTrends = Object.values(dailyDataMap).slice(-10);

    const totalPOForRate = pos.filter(po => po.status !== 'DRAFT' && po.status !== 'REJECTED').length;
    const completedGRNsCount = grns.filter(g => g.status === 'RECEIVED').length;
    const fulfillmentRate = totalPOForRate > 0 ? Math.min(100, Math.round((completedGRNsCount / totalPOForRate) * 100)) : 100;

    return {
      totalInflow,
      totalOutflow,
      fulfillmentRate,
      dailyTrends,
      grnLogCount: grns.length
    };
  }, [filteredMovements, pos, grns]);

  // 5. Site Consumption Report Data
  const siteConsumptionReport = useMemo(() => {
    return projects.map(proj => {
      const projectMovements = movements.filter(m => m.projectId === proj.id);
      const totalConsumptionQty = projectMovements.filter(m => 
        m.type === MovementType.MATERIAL_ISSUE || 
        m.type === MovementType.CONSUMPTION_ENTRY || 
        m.type === MovementType.SITE_TRANSFER ||
        m.type === MovementType.ISSUE_TO_SITE ||
        m.type === MovementType.OUT
      ).reduce((sum, m) => sum + Math.abs(m.quantity), 0);

      let estimatedConsumedValue = 0;
      projectMovements.forEach(m => {
         const product = products.find(p => p.id === m.productId);
         const cost = product?.minStockLevel ? (product?.minStockLevel * 100) / 10 : 250;
         estimatedConsumedValue += Math.abs(m.quantity) * cost;
      });

      return {
        id: proj.id,
        name: proj.name,
        location: proj.location || 'N/A',
        consumptionQty: totalConsumptionQty,
        consumedValue: estimatedConsumedValue,
        status: proj.status || 'ACTIVE'
      };
    }).sort((a, b) => b.consumptionQty - a.consumptionQty);
  }, [projects, movements, products]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  // CSV Exporter
  const handleExportCSV = () => {
    let csvContent = "";
    let fileName = "report.csv";

    if (selectedReportType === 'MATERIAL_REQUIREMENT') {
      fileName = "Material_Requirement_Report.csv";
      csvContent = "Product,SKU,Category,Min Stock,Physical Stock,Reserved,Incoming,Required to Refill,Status\n" + 
        materialRequirementsReport.map(r => `"${r.name}","${r.sku}","${r.category}",${r.minStock},${r.physical},${r.reserved},${r.incoming},${r.requiredQty},"${r.status}"`).join("\n");
    } else if (selectedReportType === 'PROCUREMENT') {
      fileName = "Procurement_Report.csv";
      csvContent = "PO Number,Item,Qty Ordered,UnitPrice,Total Cost,Vendor,Project,Status,Date\n" + 
        procurementReport.detailedItemsList.map(r => `"${r.poNumber}","${r.itemName}",${r.qtyOrdered},${r.price},${r.qtyOrdered * r.price},"${r.vendorName}","${r.projectName}","${r.status}","${r.createdAt}"`).join("\n");
    } else if (selectedReportType === 'VENDOR_PROCUREMENT') {
      fileName = "Vendor_Procurement_Report.csv";
      csvContent = "Vendor Name,Contact,PO Count,Spent Amount (INR),Open Orders,Unique SKUs\n" + 
        vendorProcurementReport.map(r => `"${r.name}","${r.contact}",${r.ordersCount},${r.spent},${r.activeOrders},${r.uniqueItemCount}`).join("\n");
    } else if (selectedReportType === 'WAREHOUSE_FULFILLMENT') {
      fileName = "Warehouse_Fulfillment_Report.csv";
      csvContent = "Date,Item,Quantity,Movement Type,Project\n" + 
        filteredMovements.map(m => {
          const product = products.find(p => p.id === m.productId);
          const project = projects.find(p => p.id === m.projectId);
          return `"${new Date(m.createdAt).toLocaleDateString()}","${product?.name || 'N/A'}",${m.quantity},"${m.type}","${project?.name || 'Main Warehouse'}"`;
        }).join("\n");
    } else if (selectedReportType === 'SITE_CONSUMPTION') {
      fileName = "Site_Consumption_Report.csv";
      csvContent = "Project Site,Location,Status,Consumption Qty,Est Value (INR)\n" + 
        siteConsumptionReport.map(r => `"${r.name}","${r.location}","${r.status}",${r.consumptionQty},${r.consumedValue}`).join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans p-6 sm:p-8 bg-slate-50/20 rounded-3xl border border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 italic font-serif">
            Analytics & Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time material requirements, supplier spends, warehouse flows, and dynamic consumption ledgers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!projectIdParam && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px] h-11 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={timeFilter} onValueChange={(val: '30D'|'3M'|'6M'|'12M') => setTimeFilter(val)}>
            <SelectTrigger className="w-[140px] h-11 rounded-xl bg-white border-slate-200">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30D">Last 30 Days</SelectItem>
              <SelectItem value="3M">Last 3 Months</SelectItem>
              <SelectItem value="6M">Last 6 Months</SelectItem>
              <SelectItem value="12M">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-0">
        <button
          onClick={() => setActiveTab('ANALYTICS')}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 px-1 transition-all",
            activeTab === 'ANALYTICS' ? "border-primary text-slate-950 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-850"
          )}
        >
          Strategic Analytics
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 px-1 transition-all",
            activeTab === 'REPORTS' ? "border-primary text-slate-950 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-850"
          )}
        >
          Spec-Defined Reports
        </button>
      </div>

      {activeTab === 'ANALYTICS' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Material Trends Card */}
            <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50">
                 <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Material Flow (Received vs Consumed Qty)</CardTitle>
                 <CardDescription className="text-slate-500 text-xs">Dynamic incoming and outgoing stock aggregate tracking</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'sans-serif' }}
                        formatter={(val: number, name: string) => [`${val.toLocaleString()} Units`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase' }} />
                      <Bar name="Received" dataKey="received" fill="#ea580c" radius={[4, 4, 0, 0]} />
                      <Bar name="Consumed" dataKey="consumed" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Expenditure Card */}
            <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50">
                 <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Expenditure by Category (₹)</CardTitle>
                 <CardDescription className="text-slate-500 text-xs">Fulfillment shares for material domains</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[300px] flex flex-col justify-center">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenditureData.length > 0 ? expenditureData : [{ name: 'No Data', value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                        >
                          {expenditureData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          {expenditureData.length === 0 && <Cell fill="#f1f5f9" />}
                        </Pie>
                        <Tooltip 
                          formatter={(val: number, name: string) => expenditureData.length > 0 ? [`₹${val.toLocaleString()}`, name] : ['N/A', '']}
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
                     {expenditureData.slice(0, 8).map((item, i) => {
                        const pct = totalExpenditure > 0 ? ((item.value / totalExpenditure) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 w-20">
                             <div className="flex items-center gap-1 w-full justify-center">
                               <span className="w-2 rounded-full shrink-0 h-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                               <span className="text-[10px] uppercase font-bold text-slate-600 truncate">{item.name}</span>
                             </div>
                             <div className="flex items-center gap-1 text-[10px] font-bold">
                               <span className="text-slate-700">{pct}%</span>
                               <span className="text-slate-400 hidden sm:inline">({(item.value / 1000).toFixed(0)}k)</span>
                             </div>
                          </div>
                        )
                     })}
                     {expenditureData.length === 0 && (
                       <p className="text-[10px] uppercase text-slate-400 italic">No purchase data available</p>
                     )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Procurement Trend Card */}
          <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Procurement Volume (Purchase Value ₹)</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Total purchase order financial trend lines</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={turnoverData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip 
                      formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Ordered Value']}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#ea580c" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Controls Segment for spec reports */}
          <Card className="rounded-2xl border border-slate-100 p-6 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                <Select value={selectedReportType} onValueChange={(val: any) => setSelectedReportType(val)}>
                  <SelectTrigger className="w-full sm:w-[320px] h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-800">
                    <SelectValue placeholder="Select Report Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100">
                    <SelectItem value="MATERIAL_REQUIREMENT">Material Requirement Report</SelectItem>
                    <SelectItem value="PROCUREMENT">Procurement Report</SelectItem>
                    <SelectItem value="VENDOR_PROCUREMENT">Vendor Procurement Report</SelectItem>
                    <SelectItem value="WAREHOUSE_FULFILLMENT">Warehouse Fulfillment Report</SelectItem>
                    <SelectItem value="SITE_CONSUMPTION">Site Consumption Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 px-5 h-11 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm shrink-0 shadow-xs"
              >
                <Download className="w-4 h-4" /> Export CSV Report
              </button>
            </div>
          </Card>

          {/* DYNAMIC SPEC-DEFINED RENDERED REPORT VIEW */}
          {selectedReportType === 'MATERIAL_REQUIREMENT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Out of Stock SKU</p>
                  <h3 className="text-3xl font-black text-slate-950 mt-1">
                    {materialRequirementsReport.filter(r => r.physical === 0).length}
                  </h3>
                </Card>
                <Card className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock Warning</p>
                  <h3 className="text-3xl font-black text-slate-950 mt-1">
                    {materialRequirementsReport.filter(r => r.status === 'LOW_STOCK').length}
                  </h3>
                </Card>
                <Card className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Satisfied SKUs</p>
                  <h3 className="text-3xl font-black text-slate-950 mt-1">
                    {materialRequirementsReport.filter(r => r.status === 'IN_STOCK').length}
                  </h3>
                </Card>
              </div>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                  <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Required Refill Breakdown</CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Auto calculation of refill amount to maintain minimum stock level rules</p>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto w-full">
                  <div className="hidden md:block min-w-full">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-4 pl-8">Material SKU</th>
                        <th>Category</th>
                        <th className="text-right">Min Stock</th>
                        <th className="text-right">Physical Stock</th>
                        <th className="text-right">Reserved</th>
                        <th className="text-right text-orange-600 font-black">Refill Needed</th>
                        <th className="pr-8 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {materialRequirementsReport.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-8">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{row.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono uppercase">{row.sku}</span>
                            </div>
                          </td>
                          <td className="text-slate-500 font-medium">{row.category}</td>
                          <td className="text-right font-mono text-slate-600 font-bold">{row.minStock} {row.unit}</td>
                          <td className="text-right font-mono text-slate-955 font-bold">{row.physical} {row.unit}</td>
                          <td className="text-right font-mono text-slate-455 font-bold">{row.reserved}</td>
                          <td className={cn("text-right font-mono font-black", row.requiredQty > 0 ? "text-red-600" : "text-slate-400")}>
                            {row.requiredQty > 0 ? `+${row.requiredQty} ${row.unit}` : "-"}
                          </td>
                          <td className="text-right pr-8">
                            <span className={cn(
                              "inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-xs",
                              row.status === 'NO_STOCK' ? "bg-red-50 text-red-700 font-extrabold" :
                              row.status === 'LOW_STOCK' ? "bg-amber-50 text-amber-700 font-extrabold" :
                              "bg-emerald-50 text-emerald-700"
                            )}>
                              {row.status === 'NO_STOCK' ? 'Zero Stock' : row.status === 'LOW_STOCK' ? 'Low Stock' : 'Optimized'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                      {materialRequirementsReport.map((row, index) => (
                         <div key={index} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                               <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 leading-tight">{row.name}</span>
                                  <span className="text-[11px] text-slate-400 font-mono uppercase mt-0.5">{row.sku}</span>
                               </div>
                               <span className={cn(
                                 "inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-xs",
                                 row.status === 'NO_STOCK' ? "bg-red-50 text-red-700 font-extrabold" :
                                 row.status === 'LOW_STOCK' ? "bg-amber-50 text-amber-700 font-extrabold" :
                                 "bg-emerald-50 text-emerald-700"
                               )}>
                                 {row.status === 'NO_STOCK' ? 'Zero Stock' : row.status === 'LOW_STOCK' ? 'Low Stock' : 'Optimized'}
                               </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                               <span className="text-slate-500 font-medium px-2 py-1 bg-slate-50 rounded-lg">{row.category}</span>
                               <div className="flex flex-col text-right">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Physical</span>
                                  <span className="font-mono font-bold text-slate-950">{row.physical} <span className="text-slate-500 text-[10px]">{row.unit}</span></span>
                               </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl mt-1">
                                <div className="flex flex-col">
                                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Min</span>
                                   <span className="font-mono text-slate-600 font-bold text-xs">{row.minStock}</span>
                                </div>
                                <div className="flex flex-col border-l border-slate-200 pl-2">
                                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Res</span>
                                   <span className="font-mono text-slate-400 font-bold text-xs">{row.reserved}</span>
                                </div>
                                <div className="flex flex-col text-right border-l border-slate-200 pl-2">
                                   <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-1">Refill</span>
                                   <span className={cn("font-mono font-black text-xs", row.requiredQty > 0 ? "text-red-600" : "text-slate-400")}>
                                     {row.requiredQty > 0 ? `+${row.requiredQty}` : "-"}
                                   </span>
                                </div>
                            </div>
                         </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedReportType === 'PROCUREMENT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="rounded-2xl p-6 bg-white border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total PR Count</p>
                  <h3 className="text-3xl font-black text-slate-950 mt-1">{procurementReport.metrics.totalPRs}</h3>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {procurementReport.metrics.pendingPR} Pending / {procurementReport.metrics.approvedPR} Approved
                  </div>
                </Card>
                <Card className="rounded-2xl p-6 bg-white border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total PO Volume</p>
                  <h3 className="text-3xl font-black text-slate-950 mt-1">{procurementReport.metrics.totalPOs}</h3>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    {procurementReport.metrics.approvedPOs} Approved POs
                  </div>
                </Card>
                <Card className="rounded-2xl p-6 bg-white border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Estimated PO Liability</p>
                  <h3 className="text-3xl font-black text-slate-950 mt-1">₹{(procurementReport.metrics.openPOsValue / 1000).toFixed(1)}k</h3>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Outstanding active PO spends
                  </div>
                </Card>
                <Card className="rounded-2xl p-6 bg-white border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cumulative Spend</p>
                  <h3 className="text-3xl font-black text-emerald-600 mt-1">₹{(procurementReport.metrics.totalSpent / 100000).toFixed(2)}L</h3>
                  <div className="text-[11px] text-emerald-600 mt-1 font-mono">
                    Fitted PO values total
                  </div>
                </Card>
              </div>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                  <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Procurement Item Ledger</CardTitle>
                  <p className="text-xs text-slate-500 font-medium font-heading">Itemized purchase records mapping directly to suppliers and active requisitions</p>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto w-full">
                  <div className="hidden md:block min-w-full">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-4 pl-8">PO Reference</th>
                        <th>Item Description</th>
                        <th className="text-right">Qty Ordered</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Total Spends</th>
                        <th>Vendor Partner</th>
                        <th>Project Dest</th>
                        <th className="pr-8 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {procurementReport.detailedItemsList.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-8 font-mono font-bold text-slate-900 uppercase">
                            {row.poNumber}
                          </td>
                          <td className="font-bold text-slate-950">{row.itemName}</td>
                          <td className="text-right font-mono font-bold text-slate-700">{row.qtyOrdered}</td>
                          <td className="text-right font-mono text-slate-655">₹{row.price.toLocaleString()}</td>
                          <td className="text-right font-mono font-black text-slate-950">₹{(row.qtyOrdered * row.price).toLocaleString()}</td>
                          <td className="text-slate-600 text-xs font-semibold">{row.vendorName}</td>
                          <td className="text-slate-500 font-medium max-w-xs truncate">{row.projectName}</td>
                          <td className="text-right pr-8">
                            <span className={cn(
                              "inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase",
                              row.status === 'RECEIVED' || row.status === 'CLOSED' ? "bg-emerald-50 text-emerald-700" :
                              row.status === 'REJECTED' ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                            )}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {procurementReport.detailedItemsList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-400 font-mono italic">
                            No active procurement logs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                     {procurementReport.detailedItemsList.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">No active procurement logs found.</div>
                     ) : procurementReport.detailedItemsList.map((row) => (
                        <div key={row.id} className="p-4 flex flex-col gap-3">
                           <div className="flex justify-between items-start">
                              <span className="font-mono font-bold text-slate-900 uppercase">{row.poNumber}</span>
                              <span className={cn(
                                "inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase",
                                row.status === 'RECEIVED' || row.status === 'CLOSED' ? "bg-emerald-50 text-emerald-700" :
                                row.status === 'REJECTED' ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                              )}>
                                {row.status}
                              </span>
                           </div>
                           
                           <div>
                              <p className="font-bold text-slate-950 leading-tight">{row.itemName}</p>
                              <p className="text-slate-500 font-medium text-xs mt-1 truncate">{row.projectName}</p>
                           </div>
                           
                           <div className="bg-slate-50 p-3 rounded-xl flex flex-col gap-2">
                              <div className="flex justify-between items-center text-xs">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Qty & Price</span>
                                 <span className="font-mono text-slate-600 font-bold">{row.qtyOrdered} × ₹{row.price.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Spent</span>
                                 <span className="font-mono font-black text-slate-950 text-sm">₹{(row.qtyOrdered * row.price).toLocaleString()}</span>
                              </div>
                           </div>
                           
                           <div className="flex items-center text-xs text-slate-600 font-semibold gap-2">
                              <Store className="w-3.5 h-3.5" />
                              {row.vendorName}
                           </div>
                        </div>
                     ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedReportType === 'VENDOR_PROCUREMENT' && (
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                  <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Vendor Procurement Analysis</CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Aggregated order values, fulfillment tracking, and transaction statistics by vendor</p>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto w-full">
                  <div className="hidden md:block min-w-full">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-4 pl-8">Vendor Partner</th>
                        <th>Contact / Info</th>
                        <th className="text-right">PO Count</th>
                        <th className="text-right">Unique Items Type</th>
                        <th className="text-right">Outstanding Orders</th>
                        <th className="text-right pr-8 text-primary font-black">Cumulative Spent (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {vendorProcurementReport.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-8">
                            <span className="font-bold text-slate-900 text-base">{row.name}</span>
                          </td>
                          <td className="text-slate-500 text-xs font-mono">{row.contact}</td>
                          <td className="text-right font-mono font-bold text-slate-600">{row.ordersCount} POs</td>
                          <td className="text-right font-mono text-slate-500">{row.uniqueItemCount} SKUs</td>
                          <td className="text-right font-mono text-amber-600 font-bold">{row.activeOrders} active</td>
                          <td className="text-right pr-8 font-mono font-black text-slate-950 text-base">
                            ₹{row.spent.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                     {vendorProcurementReport.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">No vendor analysis records found.</div>
                     ) : vendorProcurementReport.map((row) => (
                        <div key={row.id} className="p-4 flex flex-col gap-3 group hover:bg-slate-50/50 transition-colors">
                           <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900 text-lg leading-none flex items-center gap-2"><Store className="w-5 h-5 text-slate-400" />{row.name}</span>
                              <span className="font-mono text-xs text-slate-500">{row.contact}</span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-slate-50 rounded-xl p-3 flex flex-col">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">POs & SKUs</span>
                                 <span className="font-mono font-bold text-slate-600 text-xs">{row.ordersCount} POs · {row.uniqueItemCount} SKUs</span>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-end text-right">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Outstanding</span>
                                 <span className="font-mono font-bold text-amber-600 text-xs">{row.activeOrders} active</span>
                              </div>
                           </div>
                           
                           <div className="flex justify-between items-center bg-slate-50/50 border border-slate-100 rounded-xl p-3 mt-1">
                               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cumulative Spent</span>
                               <span className="font-mono font-black text-slate-950 text-base">₹{row.spent.toLocaleString()}</span>
                           </div>
                        </div>
                     ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedReportType === 'WAREHOUSE_FULFILLMENT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl p-6 bg-white border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Warehouse Inflow (GRN)</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{warehouseFulfillmentReport.totalInflow} Units</h3>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Warehouse className="w-5 h-5" />
                  </div>
                </Card>
                <Card className="rounded-2xl p-6 bg-white border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Site Outflow (Issues)</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{warehouseFulfillmentReport.totalOutflow} Units</h3>
                  </div>
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </Card>
                <Card className="rounded-2xl p-6 bg-white border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">PO-to-GRN Fulfillment Rate</p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{warehouseFulfillmentReport.fulfillmentRate}%</h3>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </Card>
              </div>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                  <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Recent Warehouse Movements Ledger</CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Flow ledger detailing physical stock arrivals and site mobilization actions</p>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto w-full">
                  <div className="hidden md:block min-w-full">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-4 pl-8">Movement Timestamp</th>
                        <th>Material Item</th>
                        <th className="text-right">Quantity Transferred</th>
                        <th>Movement Type</th>
                        <th className="pr-8">Target Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {movements.slice(0, 15).map((row) => {
                        const product = products.find(p => p.id === row.productId);
                        const project = projects.find(p => p.id === row.projectId);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pl-8 font-mono text-xs text-slate-500">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                            <td className="font-bold text-slate-900">
                              {product?.name || 'Unknown SKU'}
                            </td>
                            <td className={cn("text-right font-mono font-black", row.quantity > 0 ? "text-emerald-600" : "text-amber-600")}>
                              {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                            </td>
                            <td className="font-mono text-[11px] text-slate-500">{row.type}</td>
                            <td className="text-slate-600 font-semibold pr-8">
                              {project?.name || 'Main Warehouse'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                     {movements.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">No warehouse movements found.</div>
                     ) : movements.slice(0, 15).map((row) => {
                        const product = products.find(p => p.id === row.productId);
                        const project = projects.find(p => p.id === row.projectId);
                        return (
                           <div key={row.id} className="p-4 flex flex-col gap-2 relative overflow-hidden group">
                               <div className="flex justify-between items-start">
                                  <div>
                                     <p className="font-bold text-slate-950 text-[15px]">{product?.name || 'Unknown SKU'}</p>
                                     <p className="font-mono text-[10px] text-slate-400 mt-0.5">{new Date(row.createdAt).toLocaleString()}</p>
                                  </div>
                                  <span className={cn(
                                     "font-mono font-black text-lg",
                                     row.quantity > 0 ? "text-emerald-600" : "text-amber-600"
                                  )}>
                                     {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                                  </span>
                               </div>
                               
                               <div className="flex items-center gap-2 mt-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                   <Badge variant="outline" className="rounded-full border-slate-200 font-mono text-[9px] uppercase text-slate-500">
                                      {row.type}
                                   </Badge>
                                   <span className="text-slate-400">→</span>
                                   <span className="text-xs font-semibold text-slate-700 truncate">{project?.name || 'Main Warehouse'}</span>
                               </div>
                           </div>
                        );
                     })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedReportType === 'SITE_CONSUMPTION' && (
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                  <CardTitle className="text-lg font-black text-slate-900 italic font-serif">Project Site Consumption Ledger</CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Aggregate materials consumption and estimated construction goods mobilization volume by active site</p>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto w-full">
                  <div className="hidden md:block min-w-full">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-4 pl-8">Project Construction Site</th>
                        <th>Site Location</th>
                        <th className="text-right">Cumulative Consumption Qty</th>
                        <th className="text-right pr-8 text-primary font-black">Estimated Value Transferred (₹)</th>
                        <th>Project Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {siteConsumptionReport.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-8 font-bold text-slate-950 text-lg">
                            {row.name}
                          </td>
                          <td className="text-slate-600 text-xs font-semibold">{row.location}</td>
                          <td className="text-right font-mono font-black text-slate-700 text-base">{row.consumptionQty.toLocaleString()} units</td>
                          <td className="text-right pr-8 font-mono font-black text-slate-950 text-lg">
                            ₹{row.consumedValue.toLocaleString()}
                          </td>
                          <td>
                            <span className={cn(
                              "inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase",
                              row.status === 'COMPLETED' ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-850"
                            )}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                     {siteConsumptionReport.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">No project sites found.</div>
                     ) : siteConsumptionReport.map((row) => (
                        <div key={row.id} className="p-4 flex flex-col gap-3 relative overflow-hidden">
                           <div className="flex justify-between items-start">
                              <div>
                                 <h4 className="font-bold text-slate-950 text-lg leading-tight">{row.name}</h4>
                                 <p className="text-slate-500 font-medium text-xs mt-0.5">{row.location}</p>
                              </div>
                              <span className={cn(
                                "inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-xs shrink-0",
                                row.status === 'COMPLETED' ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"
                              )}>
                                {row.status}
                              </span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <div className="flex flex-col">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Consumption Qty</span>
                                 <span className="font-mono font-black text-slate-700">{row.consumptionQty.toLocaleString()} <span className="text-[10px] font-sans text-slate-500">units</span></span>
                              </div>
                              <div className="flex flex-col text-right">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Estimated Value</span>
                                 <span className="font-mono font-black text-slate-950 text-base">₹{row.consumedValue.toLocaleString()}</span>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


