import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  FileText, 
  TrendingUp, 
  Package, 
  Truck, 
  Download, 
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Warehouse,
  History,
  FileSearch,
  ShoppingCart,
  Eye,
  Lock,
  AlertTriangle,
  Clock,
  Trash2,
  Loader2,
  Plus,
  Settings
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  POService, 
  MovementService, 
  ProductService, 
  ProjectService,
  VendorService,
  GRNService,
  InventoryService,
  PRService,
  MaterialRequisitionService
} from '@/services/store';
import { 
  ProjectReturnService
} from '@/services/store';
import { 
  PurchaseOrder, 
  StockMovement, 
  Product, 
  MovementType, 
  Project,
  Vendor,
  GRN,
  MAIN_WAREHOUSE_PROJECT_ID,
  Stock,
  PurchaseRequisition,
  MaterialRequisition,
  ProjectReturn
} from '@/types';
import { cn, getStockStatus, getStockStatusColor } from '@/lib/utils';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

function safeFormatDate(dateValue: any, fmt: string = 'dd MMM yyyy'): string {
  if (!dateValue) return 'N/A';
  const parsed = new Date(dateValue);
  if (isNaN(parsed.getTime())) {
    return 'N/A';
  }
  try {
    return format(parsed, fmt);
  } catch (error) {
    return 'N/A';
  }
}

function getSafeTime(dateValue: any): number {
  if (!dateValue) return 0;
  const parsed = new Date(dateValue);
  const t = parsed.getTime();
  return isNaN(t) ? 0 : t;
}

const COLORS = ['#0f172a', '#ea580c', '#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function InventoryDashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === UserRole.ADMIN;
  
  const [activeTab, setActiveTab] = useState('stock-summary');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Deletion state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationPhrase, setDeleteConfirmationPhrase] = useState('');

  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [selectedGrn, setSelectedGrn] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // data state
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [mrs, setMrs] = useState<MaterialRequisition[]>([]);
  const [projectReturns, setProjectReturns] = useState<ProjectReturn[]>([]);

  // Stock Adjustment State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isAdjustmentSubmitting, setIsAdjustmentSubmitting] = useState(false);

  const [addStockForm, setAddStockForm] = useState({
    productId: '',
    quantity: 0,
    type: MovementType.MANUAL_ADDITION,
    referenceNumber: '',
    remarks: ''
  });

  const [adjustStockForm, setAdjustStockForm] = useState({
    productId: '',
    quantity: 0,
    mode: 'INCREMENT' as 'INCREMENT' | 'DECREMENT' | 'SET',
    remarks: ''
  });

  // Smart Search State
  const [productSearch, setProductSearch] = useState('');
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isProductCreating, setIsProductCreating] = useState(false);

  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    category: '',
    unit: 'Each',
    minStock: 0,
    unitPrice: 0,
    materialType: 'Consumable'
  });

  const filteredProductResults = useMemo(() => {
    const lowerSearch = productSearch.toLowerCase().trim();
    if (!lowerSearch) return products.slice(0, 10);
    
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.sku.toLowerCase().includes(lowerSearch) || 
      p.category.toLowerCase().includes(lowerSearch)
    ).slice(0, 15);
  }, [products, productSearch]);

  const generateSKU = (name: string) => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.name || !newProductForm.category || !newProductForm.unit) {
      toast.error('Please fill mandatory product fields');
      return;
    }

    setIsProductCreating(true);
    try {
      const sku = newProductForm.sku || generateSKU(newProductForm.name);
      const productId = await ProductService.add({
        ...newProductForm,
        sku,
        description: `Manually created from stock entry: ${newProductForm.name}`,
        active: true
      } as any);

      toast.success('Material created successfully');
      setAddStockForm(prev => ({ ...prev, productId }));
      setIsCreateProductOpen(false);
      
      // Reset form
      setNewProductForm({
        name: '',
        sku: '',
        category: '',
        unit: 'Each',
        minStock: 0,
        unitPrice: 0,
        materialType: 'Consumable'
      });
    } catch (error) {
      toast.error('Failed to create material');
    } finally {
      setIsProductCreating(false);
    }
  };

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).sort(), [products]);

  useEffect(() => {
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubMovements = MovementService.subscribe(setMovements);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubVendors = VendorService.subscribe(setVendors);
    const unsubPos = POService.subscribe(setPos);
    const unsubGrns = GRNService.subscribe(setGrns);
    const unsubStocks = InventoryService.subscribe(setStocks);
    const unsubPrs = PRService.subscribe(setPrs);
    const unsubMrs = MaterialRequisitionService.subscribe(setMrs);
    const unsubProjectReturns = ProjectReturnService.subscribe(setProjectReturns);

    return () => {
      unsubProducts();
      unsubMovements();
      unsubProjects();
      unsubVendors();
      unsubPos();
      unsubGrns();
      unsubStocks();
      unsubPrs();
      unsubMrs();
      unsubProjectReturns();
    };
  }, []);

  // Filters logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedCategory === 'ALL' || p.category === selectedCategory)
    );
  }, [products, searchTerm, selectedCategory]);

  // PAGE STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // STOCK SUMMARY CALCULATION
  const stockSummaryData = useMemo(() => {
    return filteredProducts.map(p => {
      const pm = movements.filter(m => m.productId === p.id && (m.projectId === MAIN_WAREHOUSE_PROJECT_ID || m.department === 'WAREHOUSE'));
      const stock = pm.reduce((acc, m) => {
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
        const change = isInbound ? Math.abs(m.quantity) : -Math.abs(m.quantity);
        return acc + change;
      }, 0);
      return { ...p, currentStock: stock };
    }).filter(p => {
        if (selectedStatus === 'ALL') return true;
        const status = getStockStatus(p.currentStock, p.minStockLevel);
        return selectedStatus === 'ALL' || status === selectedStatus;
    });
  }, [filteredProducts, movements, selectedStatus]);

  const handleAddStock = async () => {
    if (!addStockForm.productId || addStockForm.quantity <= 0 || !addStockForm.remarks) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    setIsAdjustmentSubmitting(true);
    try {
      await InventoryService.directStockAdjustment({
        productId: addStockForm.productId,
        projectId: MAIN_WAREHOUSE_PROJECT_ID,
        quantity: addStockForm.quantity,
        mode: 'INCREMENT',
        type: addStockForm.type,
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'unknown',
        remarks: addStockForm.remarks,
        referenceNumber: addStockForm.referenceNumber
      });
      toast.success('Stock added successfully');
      setIsAddStockOpen(false);
      setAddStockForm({
        productId: '',
        quantity: 0,
        type: MovementType.MANUAL_ADDITION,
        referenceNumber: '',
        remarks: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add stock');
    } finally {
      setIsAdjustmentSubmitting(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustStockForm.productId || adjustStockForm.quantity < 0 || !adjustStockForm.remarks) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    setIsAdjustmentSubmitting(true);
    try {
      await InventoryService.directStockAdjustment({
        productId: adjustStockForm.productId,
        projectId: MAIN_WAREHOUSE_PROJECT_ID,
        quantity: adjustStockForm.quantity,
        mode: adjustStockForm.mode,
        type: MovementType.STOCK_ADJUSTMENT,
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'unknown',
        remarks: adjustStockForm.remarks
      });
      toast.success('Stock adjusted successfully');
      setIsAdjustStockOpen(false);
      setAdjustStockForm({
        productId: '',
        quantity: 0,
        mode: 'INCREMENT',
        remarks: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust stock');
    } finally {
      setIsAdjustmentSubmitting(false);
    }
  };

  // PAGINATED DATA
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return stockSummaryData.slice(startIndex, startIndex + itemsPerPage);
  }, [stockSummaryData, currentPage]);
  
  const totalPages = Math.ceil(stockSummaryData.length / itemsPerPage);

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    if (deleteConfirmationPhrase !== 'DELETE') {
      toast.error('Invalid confirmation phrase');
      return;
    }

    setIsDeleting(true);
    try {
      await ProductService.delete(productToDelete.id);
      
      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        adminName: profile?.name,
        action: 'MANUAL_DELETE',
        module: 'INVENTORY/PRODUCT',
        recordId: productToDelete.id,
        recordName: productToDelete.name,
        timestamp: new Date().toISOString()
      });

      toast.success('Product and all related inventory visibility removed');
      setIsDeleteConfirmOpen(false);
      setProductToDelete(null);
      setDeleteConfirmationPhrase('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // RESET PAGE ON FILTER CHANGE
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  // PROJECT-WISE PURCHASE DASHBOARD DATA
  const projectPurchaseData = useMemo(() => {
    const data = projects.map(proj => {
      const projectPos = pos.filter(p => p.projectId === proj.id && p.status !== 'REJECTED');
      const totalSpend = projectPos.reduce((acc, p) => acc + p.totalAmount, 0);
      return { name: proj.name, value: totalSpend };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
    return data;
  }, [projects, pos]);

  // WAREHOUSE STOCK DATA
  const warehouseStockData = useMemo(() => {
    // Only items in the MAIN WAREHOUSE project are warehouse stock
    const warehouseMovements = movements.filter(m => m.projectId === MAIN_WAREHOUSE_PROJECT_ID || m.department === 'WAREHOUSE');
    
    const stockByProduct = products.map(p => {
        const pMovements = warehouseMovements.filter(m => m.productId === p.id);
        const stock = pMovements.reduce((acc, m) => {
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
          const change = isInbound ? Math.abs(m.quantity) : -Math.abs(m.quantity);
          return acc + change;
        }, 0);
        return { name: p.name, sku: p.sku, qty: stock, unit: p.unit };
    }).filter(s => s.qty >= 0);

    return [{ id: MAIN_WAREHOUSE_PROJECT_ID, name: 'Main Warehouse', stock: stockByProduct }];
  }, [movements, products]);

  // PROJECT-WISE INVENTORY DATA
  const projectStockData = useMemo(() => {
    return projects.map(proj => {
      // Exclude main warehouse movements
      const projMovements = movements.filter(m => m.projectId === proj.id && m.projectId !== MAIN_WAREHOUSE_PROJECT_ID);
      const stockByProduct = products.map(p => {
        const pMovements = projMovements.filter(m => m.productId === p.id);
        const stock = pMovements.reduce((acc, m) => {
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
          const change = isInbound ? Math.abs(m.quantity) : -Math.abs(m.quantity);
          return acc + change;
        }, 0);
        return { name: p.name, sku: p.sku, qty: stock, unit: p.unit };
      }).filter(s => s.qty > 0);
      
      return { id: proj.id, name: proj.name, stock: stockByProduct };
    });
  }, [projects, movements, products]);

  // PROJECT-WISE PURCHASE DASHBOARD DATA
  // ...

  // PENDING PO DATA
  const pendingPOs = useMemo(() => {
    return pos.filter(p => p.status === 'DRAFT').map(p => {
      const project = projects.find(proj => proj.id === p.projectId);
      const vendor = vendors.find(v => v.id === p.vendorId);
      return { ...p, projectName: project?.name, vendorName: vendor?.name };
    });
  }, [pos, projects, vendors]);

  // GRN REPORT DATA
  const grnReportData = useMemo(() => {
    return grns.map(g => {
      const po = pos.find(p => p.id === g.poId);
      const project = projects.find(p => p.id === g.projectId);
      const vendor = vendors.find(v => v.id === po?.vendorId);
      return { ...g, projectName: project?.name, vendorName: vendor?.name, poNumber: po?.poNumber };
    }).sort((a, b) => getSafeTime(b.createdAt) - getSafeTime(a.createdAt));
  }, [grns, pos, projects, vendors]);

  // SITE-WISE MATERIAL REPORT
  const siteWiseMaterialData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    movements.forEach(m => {
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
      if (isOutbound) {
        const proj = projects.find(p => p.id === m.projectId);
        const prod = products.find(p => p.id === m.productId);
        if (proj && prod) {
          if (!data[proj.name]) data[proj.name] = {};
          data[proj.name][prod.name] = (data[proj.name][prod.name] || 0) + Math.abs(m.quantity);
        }
      }
    });
    return Object.entries(data).map(([site, materials]) => ({
      site,
      materials: Object.entries(materials).map(([name, qty]) => ({ name, qty }))
    }));
  }, [movements, projects, products]);

  // VENDOR LEDGER DATA
  const vendorLedgerData = useMemo(() => {
    if (selectedVendor === 'ALL') return [];
    const vendorPos = pos.filter(p => p.vendorId === selectedVendor);
    const vendorGrns = grns.filter(g => {
        const po = pos.find(p => p.id === g.poId);
        return po?.vendorId === selectedVendor;
    });

    const entries = [
        ...vendorPos.map(p => ({
            date: p.createdAt,
            type: 'Purchase Order',
            ref: p.poNumber,
            amount: p.totalAmount,
            status: p.status
        })),
        ...vendorGrns.map(g => ({
            date: g.createdAt,
            type: 'GRN',
            ref: g.id.slice(-8).toUpperCase(),
            amount: 0, // GRN itself doesn't have an amount in this schema, but it reflects stock arrival
            status: g.status
        }))
    ].sort((a, b) => getSafeTime(b.date) - getSafeTime(a.date));

    return entries;
  }, [selectedVendor, pos, grns]);

  // NEW KPI Calculations
  const metrics = useMemo(() => {
    // 1. Physical Stock: Sum of stock.quantity across all stock records
    const physicalStock = stocks.reduce((acc, s) => acc + (s.quantity || 0), 0);

    // 2. Reserved Stock: Sum of stock.reservedQuantity across all stock records
    const reservedStock = stocks.reduce((acc, s) => acc + (s.reservedQuantity || 0), 0);

    // 3. Incoming Stock: Sum of stock.incomingQuantity across all stock records
    const incomingStock = stocks.reduce((acc, s) => acc + (s.incomingQuantity || 0), 0);

    // 4. Available Stock: Physical Stock - Reserved Stock
    const availableStock = Math.max(0, physicalStock - reservedStock);

    // 5. Low Stock: Count of products where sum of physical stock across all locations is < minStockLevel
    const lowStockCount = products.filter(p => {
      const productStocks = stocks.filter(s => s.productId === p.id);
      const totalStock = productStocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
      return totalStock < p.minStockLevel;
    }).length;

    // 6. Open PR: Requisitions that are PENDING_APPROVAL or APPROVED but not converted/rejected yet
    const openPRCount = prs.filter(pr => pr.status === 'PENDING_APPROVAL' || pr.status === 'APPROVED').length;

    // 7. Open PO: POs that are APPROVED, SHIPPED, or PARTIAL_RECEIVED
    const openPOCount = pos.filter(po => po.status === 'APPROVED' || po.status === 'SHIPPED' || po.status === 'PARTIAL_RECEIVED').length;

    // 8. Emergency Requests: PRs/MRs with urgency === 'EMERGENCY' that are pending approval/treatment
    const emergencyRequests = prs.filter(pr => pr.urgency === 'EMERGENCY' && (pr.status === 'PENDING_APPROVAL' || pr.status === 'APPROVED')).length;

    // 9. ERP SSOT Metrics
    const virtualReceipts = movements.filter(m => m.type === MovementType.PURCHASE_RECEIPT).length;
    const directSiteDeliveries = movements.filter(m => m.type === MovementType.DIRECT_SITE_DELIVERY_VIRTUAL).length;
    const warehouseIssues = movements.filter(m => m.type === MovementType.ISSUE_TO_SITE && m.quantity < 0).length;
    const siteReceipts = movements.filter(m => m.type === MovementType.ISSUE_TO_SITE && m.quantity > 0).length;

    // 10. Project Return Metrics
    const pendingReturns = projectReturns.filter(r => r.status === 'SUBMITTED' || r.status === 'WAREHOUSE_REVIEW').length;
    const returnedCount = projectReturns.filter(r => r.status === 'RETURNED').length;
    const damagedReturns = projectReturns.filter(r => r.returnType === 'DAMAGED_MATERIAL' || r.condition === 'DAMAGED').reduce((sum, r) => sum + r.returnQuantity, 0);

    let returnValueTotal = 0;
    let recoveryValueTotal = 0;
    projectReturns.forEach(r => {
      const product = products.find(p => p.id === r.productId);
      if (product) {
        const value = (product.unitPrice || 0) * (r.approvedQuantity || r.returnQuantity);
        if (r.status === 'RETURNED') {
          returnValueTotal += value;
          if (r.condition === 'GOOD' && r.returnType !== 'DAMAGED_MATERIAL') {
            recoveryValueTotal += value;
          }
        }
      }
    });

    return {
      physicalStock,
      reservedStock,
      incomingStock,
      availableStock,
      lowStockCount,
      openPRCount,
      openPOCount,
      emergencyRequests,
      virtualReceipts,
      directSiteDeliveries,
      warehouseIssues,
      siteReceipts,
      pendingReturns,
      returnedCount,
      damagedReturns,
      returnValueTotal,
      recoveryValueTotal
    };
  }, [stocks, prs, pos, products, movements, projectReturns]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Warehouse className="w-8 h-8" />
            <h1 className="text-3xl sm:text-4xl font-black font-heading italic tracking-tight text-slate-900">
              Inventory Dashboard
            </h1>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl text-xs sm:text-sm">
            Real-time material visibility, procurement tracking, and cross-site inventory audit.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-initial rounded-xl border-slate-200 hover:bg-slate-50 gap-2 font-bold h-12 shadow-sm">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          <Button className="flex-1 sm:flex-initial rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-12 gap-2">
            <History className="w-4 h-4" />
            Stock Reconcile
          </Button>
        </div>
      </div>

      {/* KPI Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full h-auto min-h-0 bg-transparent">
         {/* Physical Stock */}
         <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                  <Warehouse className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 rounded-full px-3 py-1 font-bold text-[10px] shadow-xs">
                  PHYSICAL
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Physical Stock</p>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">{metrics.physicalStock}</h3>
            </CardContent>
         </Card>

         {/* Reserved Stock */}
         <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600">
                  <Lock className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-800 rounded-full px-3 py-1 font-bold text-[10px] shadow-xs">
                  RESERVED
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reserved Stock</p>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">{metrics.reservedStock}</h3>
            </CardContent>
         </Card>

         {/* Incoming Stock */}
         <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600">
                  <Truck className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 rounded-full px-3 py-1 font-bold text-[10px] shadow-xs">
                  INCOMING
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Incoming Stock</p>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">{metrics.incomingStock}</h3>
            </CardContent>
         </Card>

         {/* Available Stock */}
         <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                  <Package className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-800 rounded-full px-3 py-1 font-bold text-[10px] shadow-xs">
                  AVAILABLE
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Available Stock</p>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">{metrics.availableStock}</h3>
            </CardContent>
         </Card>

         {/* Low Stock */}
         <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3.5 rounded-2xl border", metrics.lowStockCount > 0 ? "bg-red-500/10 border-red-500/20 text-red-600 animate-pulse" : "bg-slate-500/10 border-slate-500/20 text-slate-600")}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-bold text-[10px] shadow-xs", metrics.lowStockCount > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-slate-50 border-slate-200 text-slate-800")}>
                  {metrics.lowStockCount > 0 ? "ACTION REQ" : "HEALTHY"}
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Low Stock Items</p>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">{metrics.lowStockCount}</h3>
            </CardContent>
         </Card>

         {/* Open PR */}
         <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600">
                  <FileText className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="bg-teal-50 border-teal-200 text-teal-800 rounded-full px-3 py-1 font-bold text-[10px] shadow-xs">
                  REQUISITIONS
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Open PR</p>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">{metrics.openPRCount}</h3>
            </CardContent>
         </Card>

         {/* Open PO */}
         <Card className="rounded-[2rem] border border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md group hover:scale-[1.01] hover:shadow-teal-950/5 transition-all duration-300 relative">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="bg-violet-50 border-violet-200 text-violet-800 rounded-full px-3 py-1 font-bold text-[10px] shadow-xs">
                  PURCHASE ORDERS
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Open PO</p>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">{metrics.openPOCount}</h3>
            </CardContent>
         </Card>

         {/* Emergency Requests */}
         <Card className={cn("rounded-[2rem] border group hover:scale-[1.01] transition-all duration-300 relative", metrics.emergencyRequests > 0 ? "border-red-500 shadow-2xl shadow-red-500/25 bg-red-50/80 border-2" : "border-white/40 shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md hover:shadow-teal-950/5")}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3.5 rounded-2xl border", metrics.emergencyRequests > 0 ? "bg-red-600 text-white border-transparent animate-bounce shadow-md" : "bg-slate-500/10 border-slate-500/20 text-slate-600")}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-bold text-[10px] shadow-xs", metrics.emergencyRequests > 0 ? "bg-red-600 border-transparent text-white animate-pulse" : "bg-slate-50 border-slate-200 text-slate-800")}>
                  {metrics.emergencyRequests > 0 ? "🚨 EMERGENCY ALERT" : "NORMAL"}
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Emergency Requests</p>
              <h3 className={cn("text-4xl font-black tracking-tight leading-none", metrics.emergencyRequests > 0 ? "text-red-600 font-black animate-pulse" : "text-slate-950")}>{metrics.emergencyRequests}</h3>
            </CardContent>
         </Card>
      </div>

      {/* Moved to Bottom */}
      <div className="hidden">
        {/* Project Return Metrics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
         {/* Pending Returns */}
         <Card className="rounded-[2rem] border border-orange-500/30 shadow-xl shadow-orange-500/5 bg-orange-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600">
                  <Clock className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                  PENDING
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Returns</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.pendingReturns}</h3>
            </CardContent>
         </Card>

         {/* Returned Materials */}
         <Card className="rounded-[2rem] border border-emerald-500/30 shadow-xl shadow-emerald-500/5 bg-emerald-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                  <Package className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                  PROCESSED
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Returned Materials</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.returnedCount}</h3>
            </CardContent>
         </Card>

         {/* Return Value */}
         <Card className="rounded-[2rem] border border-blue-500/30 shadow-xl shadow-blue-500/5 bg-blue-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                  VALUE
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Return Value</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">${metrics.returnValueTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            </CardContent>
         </Card>

         {/* Damaged Returns */}
         <Card className="rounded-[2rem] border border-red-500/30 shadow-xl shadow-red-500/5 bg-red-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="bg-red-50 border-red-200 text-red-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                  DAMAGED
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Damaged Qty</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{metrics.damagedReturns}</h3>
            </CardContent>
         </Card>

         {/* Warehouse Recovery Value */}
         <Card className="rounded-[2rem] border border-violet-500/30 shadow-xl shadow-violet-500/5 bg-violet-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-600">
                  <History className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="bg-violet-50 border-violet-200 text-violet-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                  RECOVERED
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Warehouse Recovery Value</p>
              <h3 className="text-2xl font-black text-violet-900 tracking-tight leading-none">${metrics.recoveryValueTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            </CardContent>
         </Card>
      </div>

      {/* ERP SSOT Audit Section */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-slate-950/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-heading italic tracking-tight text-orange-400">Main Warehouse SSOT Audit</h2>
            <p className="text-slate-400 text-xs font-medium">Compliance tracking for mandatory virtual flow: Vendor → Warehouse → Site</p>
          </div>
          <Badge className="bg-orange-600 hover:bg-orange-700 text-[10px] font-bold py-1 px-3 rounded-full">ENFORCED</Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Virtual Wh. Receipts</p>
            <div className="flex items-center justify-between">
              <h4 className="text-3xl font-black text-white italic">{metrics.virtualReceipts}</h4>
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><ArrowUpRight className="w-4 h-4" /></div>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Warehouse Issues</p>
            <div className="flex items-center justify-between">
              <h4 className="text-3xl font-black text-white italic">{metrics.warehouseIssues}</h4>
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400"><ArrowDownRight className="w-4 h-4" /></div>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Direct Site Deliveries</p>
            <div className="flex items-center justify-between">
              <h4 className="text-3xl font-black text-white italic">{metrics.directSiteDeliveries}</h4>
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Truck className="w-4 h-4" /></div>
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Site Receipts</p>
            <div className="flex items-center justify-between">
              <h4 className="text-3xl font-black text-white italic">{metrics.siteReceipts}</h4>
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><History className="w-4 h-4" /></div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Main Content Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 md:space-y-8">
        {/* Responsive Unified Tab bar */}
        <div className="nav-responsive-container no-scrollbar bg-white/90 backdrop-blur-md p-1 border border-slate-100 rounded-2xl shadow-xs">
          <TabsList className="bg-transparent h-auto max-h-none nav-responsive-list w-full p-0 border-none select-none">
            <TabsTrigger value="stock-summary" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center justify-center gap-2">
              <Package className="w-4 h-4 shrink-0" /> <span className="shrink-0">Stock Summary</span>
            </TabsTrigger>
            <TabsTrigger value="warehouse-stock" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center justify-center gap-2">
              <Warehouse className="w-4 h-4 shrink-0" /> <span className="shrink-0">Warehouse Stock</span>
            </TabsTrigger>
            <TabsTrigger value="purchase-dashboard" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4 shrink-0" /> <span className="shrink-0">Procurement</span>
            </TabsTrigger>
            <TabsTrigger value="pending-po" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center justify-center gap-2">
              <ShoppingCart className="w-4 h-4 shrink-0" /> <span className="shrink-0">Pending PO</span>
            </TabsTrigger>
            <TabsTrigger value="grn-report" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center justify-center gap-2">
              <FileText className="w-4 h-4 shrink-0" /> <span className="shrink-0">GRN</span>
            </TabsTrigger>
            <TabsTrigger value="vendor-ledger" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center justify-center gap-2">
              <Truck className="w-4 h-4 shrink-0" /> <span className="shrink-0">Vendor Ledger</span>
            </TabsTrigger>
            <TabsTrigger value="site-wise" className="nav-tab-item rounded-xl px-5 py-3 data-[state=active]:bg-primary data-[state=active]:text-white font-bold transition-all flex items-center justify-center gap-2">
              <Warehouse className="w-4 h-4 shrink-0" /> <span className="shrink-0">Site Material</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="stock-summary" className="space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-4 sm:p-6 md:p-8 border-b border-slate-50">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-black font-heading italic text-slate-900">Main Warehouse Inventory</CardTitle>
                  <CardDescription className="text-slate-500 font-medium text-xs sm:text-sm">Physical stock available in the master warehouse</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-3 w-full xl:w-auto">
                    {isAdmin && (
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <Button 
                          className="w-full sm:w-auto rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 h-12 shadow-md gap-2"
                          onClick={() => setIsAddStockOpen(true)}
                        >
                          <Package className="w-4 h-4" /> Add Stock
                        </Button>
                        <Button 
                          variant="outline"
                          className="w-full sm:w-auto rounded-2xl font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-12 shadow-sm gap-2"
                          onClick={() => setIsAdjustStockOpen(true)}
                        >
                          <History className="w-4 h-4" /> Adjust Stock
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full sm:w-auto rounded-2xl border-red-200 text-red-600 hover:bg-red-50 h-12 gap-2 font-bold px-4"
                          onClick={() => {
                             window.location.href = '/admin/data-management';
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Bulk Manage
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Input 
                        placeholder="Search SKU or Name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-60 h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:ring-primary/20 pl-4"
                      />
                      <div className="w-full sm:w-44">
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                               <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full sm:w-44">
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full h-12 rounded-2xl border-slate-100 bg-slate-50/50">
                               <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="IN_STOCK">In Stock</SelectItem>
                            <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                            <SelectItem value="NO_STOCK">No Stock</SelectItem>
                        </SelectContent>
                     </Select>
                   </div>
                 </div>
               </div>
             </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto w-full">
                 <div className="hidden md:block min-w-full">
               <Table>
                 <TableHeader className="bg-slate-50/50">
                   <TableRow className="border-slate-100">
                     <TableHead className="py-4 pl-8 font-bold text-slate-900">PRODUCT</TableHead>
                     <TableHead className="font-bold text-slate-900">SKU</TableHead>
                     <TableHead className="font-bold text-slate-900">CATEGORY</TableHead>
                     <TableHead className="text-right font-bold text-slate-900">CURRENT STOCK</TableHead>
                     <TableHead className="text-right font-bold text-slate-900">UNIT</TableHead>
                     <TableHead className="text-right pr-8 font-bold text-slate-900">STATUS</TableHead>
                     {isAdmin && <TableHead className="text-right pr-8 font-bold text-slate-900">ACTIONS</TableHead>}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {paginatedData.map((item) => {
                       const status = getStockStatus(item.currentStock, item.minStockLevel);
                       return (
                     <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                       <TableCell className="py-4 pl-8">
                         <span className="font-bold text-slate-900">{item.name}</span>
                       </TableCell>
                       <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                       <TableCell>
                         <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">{item.category}</Badge>
                       </TableCell>
                       <TableCell className="text-right font-black text-slate-900 italic">{item.currentStock.toLocaleString()}</TableCell>
                       <TableCell className="text-right text-slate-500 font-medium uppercase text-[10px]">{item.unit}</TableCell>
                       <TableCell className="text-right pr-8">
                          <Badge className={cn("rounded-full font-bold", getStockStatusColor(status))}>
                            {status.replace('_', ' ')}
                          </Badge>
                       </TableCell>
                       {isAdmin && (
                         <TableCell className="text-right pr-8">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg"
                              onClick={() => {
                                setProductToDelete(item);
                                setIsDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                         </TableCell>
                       )}
                     </TableRow>
                   )})}
                 </TableBody>
               </Table>
               </div>
               
               {/* Mobile view */}
               <div className="md:hidden flex flex-col divide-y divide-slate-100">
                  {paginatedData.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">No inventory found</div>
                  ) : paginatedData.map((item) => {
                     const status = getStockStatus(item.currentStock, item.minStockLevel);
                     return (
                        <div key={item.id} className="p-4 flex flex-col gap-2">
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="font-bold text-slate-900">{item.name}</p>
                                 <p className="font-mono text-xs text-slate-500">{item.sku}</p>
                              </div>
                              <Badge className={cn("rounded-full font-bold text-[10px]", getStockStatusColor(status))}>
                                {status.replace('_', ' ')}
                              </Badge>
                           </div>
                           <div className="flex justify-between items-end mt-2">
                              <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">{item.category}</Badge>
                              <div className="text-right">
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Current Stock</p>
                                 <p className="font-black text-slate-900 text-lg leading-none">{item.currentStock.toLocaleString()} <span className="text-[10px] text-slate-500 font-medium">{item.unit}</span></p>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
               </div>
            </CardContent>
            {totalPages > 1 && (
                <div className="flex items-center justify-between p-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">Page {currentPage} of {totalPages}</p>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="rounded-xl"
                        >
                            Previous
                        </Button>
                        <Button 
                            variant="outline" 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="rounded-xl"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="warehouse-stock" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {warehouseStockData.map(site => (
              <Card key={site.id} className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <CardHeader className="p-6 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Warehouse className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg font-black font-heading italic text-slate-900">{site.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full">
                    <div className="hidden md:block min-w-full">
                      <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="py-4 pl-8 font-bold text-slate-900">ITEM</TableHead>
                        <TableHead className="text-right pr-8 font-bold text-slate-900">CURRENT STOCK</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {site.stock.map((item, idx) => (
                        <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-4 pl-8">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono italic">{item.sku}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-8 font-black text-slate-900 italic">
                            {item.qty.toLocaleString()} <span className="text-[10px] text-slate-400 font-medium uppercase not-italic ml-1">{item.unit}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {site.stock.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="h-20 text-center text-slate-400 font-medium italic">
                            No active stock records for this site.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  
                  {/* Mobile view */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                    {site.stock.length === 0 ? (
                       <div className="h-20 flex items-center justify-center text-slate-400 text-sm font-medium italic">
                         No stock records.
                       </div>
                    ) : site.stock.map((item, idx) => (
                       <div key={idx} className="p-4 flex items-center justify-between">
                          <div>
                             <p className="font-bold text-slate-900">{item.name}</p>
                             <p className="font-mono text-[10px] text-slate-500">{item.sku}</p>
                          </div>
                          <div className="text-right">
                             <p className="font-black text-slate-900 leading-none">{item.qty.toLocaleString()}</p>
                             <p className="uppercase text-[10px] text-slate-500 font-medium">{item.unit}</p>
                          </div>
                       </div>
                    ))}
                  </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="purchase-dashboard" className="space-y-8">
          {/* Procurement Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Pending PR */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm bg-slate-50/20 hover:shadow-md transition-all duration-300">
               <CardContent className="p-5 flex items-center justify-between">
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Pending PR</p>
                   <h4 className="text-2xl font-black text-slate-900">{prs.filter(pr => pr.status === 'PENDING_APPROVAL').length}</h4>
                 </div>
                 <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                   <Clock className="w-4 h-4" />
                 </div>
               </CardContent>
            </Card>

            {/* Approved PR */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm bg-slate-50/20 hover:shadow-md transition-all duration-300">
               <CardContent className="p-5 flex items-center justify-between">
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Approved PR</p>
                   <h4 className="text-2xl font-black text-slate-900">{prs.filter(pr => pr.status === 'APPROVED' || pr.status === 'CONVERTED_TO_PO').length}</h4>
                 </div>
                 <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                   <FileText className="w-4 h-4" />
                 </div>
               </CardContent>
            </Card>

            {/* Rejected PR */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm bg-slate-50/20 hover:shadow-md transition-all duration-300">
               <CardContent className="p-5 flex items-center justify-between">
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Rejected PR</p>
                   <h4 className="text-2xl font-black text-slate-900">{prs.filter(pr => pr.status === 'REJECTED').length}</h4>
                 </div>
                 <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600">
                   <AlertTriangle className="w-4 h-4" />
                 </div>
               </CardContent>
            </Card>

            {/* Open PO */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm bg-slate-50/20 hover:shadow-md transition-all duration-300">
               <CardContent className="p-5 flex items-center justify-between">
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Open PO</p>
                   <h4 className="text-2xl font-black text-slate-900">{pos.filter(po => po.status === 'APPROVED' || po.status === 'SHIPPED' || po.status === 'PARTIAL_RECEIVED').length}</h4>
                 </div>
                 <div className="p-3 rounded-xl bg-violet-500/10 text-violet-600">
                   <ShoppingCart className="w-4 h-4" />
                 </div>
               </CardContent>
            </Card>

            {/* Incoming Stock */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm bg-slate-50/20 hover:shadow-md transition-all duration-300">
               <CardContent className="p-5 flex items-center justify-between">
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Incoming Stock</p>
                   <h4 className="text-2xl font-black text-slate-900">{metrics.incomingStock}</h4>
                 </div>
                 <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                   <Truck className="w-4 h-4" />
                 </div>
               </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl font-black font-heading italic text-slate-900">Project-wise Expenditure</CardTitle>
                <CardDescription>Visual distribution of purchase value across active projects</CardDescription>
              </CardHeader>
              <div className="h-[400px] mt-6">
                {projectPurchaseData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 font-medium">No Data Available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectPurchaseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {projectPurchaseData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'sans-serif' }}
                         formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Total Volume']}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl font-black font-heading italic text-slate-900">Project Investment Rankings</CardTitle>
                <CardDescription>Highest value projects by inventory procurement</CardDescription>
              </CardHeader>
              <div className="h-[400px] mt-6">
                {projectPurchaseData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 font-medium">No Data Available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectPurchaseData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        fontSize={11} 
                        width={100}
                        className="font-bold text-slate-500"
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => `₹${val.toLocaleString()}`}
                      />
                      <Bar dataKey="value" fill="#ea580c" radius={[0, 12, 12, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending-po">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-4 sm:p-6 md:p-8 border-b border-slate-50">
              <CardTitle className="text-xl sm:text-2xl font-black font-heading italic text-slate-900">Pending Purchase Orders</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500">Open orders requiring material receipt verification or final closure</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto w-full">
                 <div className="hidden md:block min-w-full">
                   <Table>
                     <TableHeader className="bg-slate-50/50">
                       <TableRow className="border-slate-100">
                         <TableHead className="py-4 pl-8 font-bold text-slate-900">PO NO.</TableHead>
                         <TableHead className="font-bold text-slate-900">PROJECT</TableHead>
                         <TableHead className="font-bold text-slate-900">VENDOR</TableHead>
                         <TableHead className="font-bold text-slate-900">DATE</TableHead>
                         <TableHead className="text-right font-bold text-slate-900">AMOUNT</TableHead>
                         <TableHead className="text-right pr-8 font-bold text-slate-900">STATUS</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {pendingPOs.map((po) => (
                         <TableRow key={po.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                           <TableCell className="py-4 pl-8">
                             <span className="font-bold text-slate-900">{po.poNumber}</span>
                           </TableCell>
                           <TableCell className="text-slate-600 font-medium">{po.projectName}</TableCell>
                           <TableCell className="text-slate-600 font-medium">{po.vendorName}</TableCell>
                           <TableCell className="text-slate-500 font-mono text-xs">{safeFormatDate(po.createdAt, 'dd MMM yyyy')}</TableCell>
                           <TableCell className="text-right font-black text-slate-900 italic">₹{po.totalAmount.toLocaleString()}</TableCell>
                           <TableCell className="text-right pr-8">
                              <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">
                                {po.status.replace(/_/g, ' ')}
                              </Badge>
                           </TableCell>
                         </TableRow>
                       ))}
                       {pendingPOs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                              No pending purchase orders found.
                            </TableCell>
                          </TableRow>
                       )}
                     </TableBody>
                   </Table>
                 </div>
               </div>

               {/* Mobile view */}
               <div className="md:hidden flex flex-col divide-y divide-slate-100 p-4">
                 {pendingPOs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">No pending purchase orders found.</div>
                 ) : pendingPOs.map((po) => (
                    <div key={po.id} className="py-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{po.poNumber}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1">{safeFormatDate(po.createdAt, 'dd MMM yyyy')}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">
                          {po.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      <div className="bg-slate-50/70 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-bold tracking-widest block mb-0.5">Project</span>
                          <span className="font-medium text-slate-700">{po.projectName}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-bold tracking-widest block mb-0.5">Vendor</span>
                          <span className="font-medium text-slate-700">{po.vendorName}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl">
                        <span className="text-xs text-slate-500 font-medium">Estimated Amount</span>
                        <span className="font-black text-slate-900 text-sm">₹{po.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grn-report">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-4 sm:p-6 md:p-8 border-b border-slate-50">
              <CardTitle className="text-xl sm:text-2xl font-black font-heading italic text-slate-900">GRN Master Report</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500">Comprehensive audit log of all goods received across the organization. Click any row to analyze full items received and quality check status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto w-full">
                 <div className="hidden md:block min-w-full">
                   <Table>
                     <TableHeader className="bg-slate-50/50">
                       <TableRow className="border-slate-100">
                         <TableHead className="py-4 pl-8 font-bold text-slate-900">GRN ID</TableHead>
                         <TableHead className="font-bold text-slate-900">PO NO.</TableHead>
                         <TableHead className="font-bold text-slate-900">PROJECT</TableHead>
                         <TableHead className="font-bold text-slate-900">VENDOR</TableHead>
                         <TableHead className="font-bold text-slate-900">RECEIVED ON</TableHead>
                         <TableHead className="font-bold text-slate-900">STATUS</TableHead>
                         <TableHead className="text-right pr-8 font-bold text-slate-900">ACTION</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {grnReportData.map((grn) => (
                         <TableRow 
                           key={grn.id} 
                           className="border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                           onClick={() => {
                             setSelectedGrn(grn);
                             setIsDetailOpen(true);
                           }}
                         >
                           <TableCell className="py-4 pl-8">
                             <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-teal-600 transition-colors">#{grn.id.slice(-8).toUpperCase()}</span>
                           </TableCell>
                           <TableCell className="font-bold text-slate-900">{grn.poNumber || 'N/A'}</TableCell>
                           <TableCell className="text-slate-600 font-medium">{grn.projectName || 'N/A'}</TableCell>
                           <TableCell className="text-slate-600 font-medium">{grn.vendorName || 'N/A'}</TableCell>
                           <TableCell className="text-slate-500 font-mono text-xs">{safeFormatDate(grn.createdAt, 'dd MMM yyyy HH:mm')}</TableCell>
                           <TableCell>
                              <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">
                                {grn.status}
                              </Badge>
                           </TableCell>
                           <TableCell className="text-right pr-8">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-10 w-10 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGrn(grn);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                       {grnReportData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium italic">
                              No Goods Receipt Notes (GRN) found.
                            </TableCell>
                          </TableRow>
                       )}
                     </TableBody>
                   </Table>
                 </div>
               </div>

               {/* Mobile view */}
               <div className="md:hidden flex flex-col divide-y divide-slate-100 p-4">
                 {grnReportData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">No Goods Receipt Notes (GRN) found.</div>
                 ) : grnReportData.map((grn) => (
                    <div 
                      key={grn.id} 
                      className="py-4 flex flex-col gap-3 cursor-pointer"
                      onClick={() => {
                        setSelectedGrn(grn);
                        setIsDetailOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-xs font-bold text-slate-400">#{grn.id.slice(-8).toUpperCase()}</p>
                          <p className="font-bold text-slate-900 mt-1">PO: {grn.poNumber || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">{safeFormatDate(grn.createdAt, 'dd MMM yyyy HH:mm')}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">
                          {grn.status}
                        </Badge>
                      </div>
                      
                      <div className="bg-slate-50/70 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-bold tracking-widest block mb-0.5">Project</span>
                          <span className="font-medium text-slate-700">{grn.projectName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-450 font-bold tracking-widest block mb-0.5">Vendor</span>
                          <span className="font-medium text-slate-700">{grn.vendorName || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 shadow-2xs rounded-lg hover:border-teal-200 hover:text-teal-600 bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGrn(grn);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Inspect Line Items
                        </Button>
                      </div>
                    </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor-ledger" className="space-y-6">
           <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <Truck className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Select Vendor for Statement</p>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                   <SelectTrigger className="w-full md:w-[350px] rounded-xl h-12 border-slate-100 shadow-none">
                      <SelectValue placeholder="Select a vendor..." />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="ALL">Select Vendor</SelectItem>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name} - {v.city}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
              </div>
           </div>

           {selectedVendor !== 'ALL' && (
             <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black font-heading italic text-slate-900">Vendor Ledger Statement</CardTitle>
                    <CardDescription>Historical log of POs and Goods Receipts for {vendors.find(v => v.id === selectedVendor)?.name}</CardDescription>
                  </div>
                  <Download className="w-6 h-6 text-slate-200" />
                </CardHeader>
                <CardContent className="p-0">
                   <div className="overflow-x-auto w-full">
                   <Table>
                     <TableHeader className="bg-slate-50/50">
                       <TableRow className="border-slate-100">
                         <TableHead className="py-4 pl-8 font-bold text-slate-900">DATE</TableHead>
                         <TableHead className="font-bold text-slate-900">TYPE</TableHead>
                         <TableHead className="font-bold text-slate-900">REFERENCE</TableHead>
                         <TableHead className="text-right pr-8 font-bold text-slate-900">AMOUNT</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {vendorLedgerData.map((entry, idx) => (
                         <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                           <TableCell className="py-4 pl-8 text-slate-500 font-mono text-xs">{safeFormatDate(entry.date, 'dd MMM yyyy')}</TableCell>
                           <TableCell>
                             <div className="flex items-center gap-2">
                               {entry.type === 'Purchase Order' ? <ArrowUpRight className="w-3 h-3 text-orange-500"/> : <ArrowDownRight className="w-3 h-3 text-emerald-500"/>}
                               <span className="font-bold text-slate-700">{entry.type}</span>
                             </div>
                           </TableCell>
                           <TableCell className="font-bold text-slate-900">{entry.ref}</TableCell>
                           <TableCell className="text-right pr-8 font-black text-slate-900 italic">
                             {entry.amount > 0 ? `₹${entry.amount.toLocaleString()}` : '-'}
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                   </div>
                </CardContent>
             </Card>
           )}
        </TabsContent>

        <TabsContent value="site-wise" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {siteWiseMaterialData.map((site, idx) => (
                <Card key={idx} className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                   <CardHeader className="p-6 bg-slate-900 text-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/10">
                          <Warehouse className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-black font-heading italic tracking-tight">{site.site}</CardTitle>
                      </div>
                   </CardHeader>
                   <CardContent className="p-6">
                      <div className="space-y-4">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Main Consumptions</p>
                        {site.materials.slice(0, 5).map((m, mIdx) => (
                          <div key={mIdx} className="flex items-center justify-between group">
                            <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{m.name}</span>
                            <span className="text-sm font-black text-slate-900 italic font-mono">{m.qty.toLocaleString()} units</span>
                          </div>
                        ))}
                        {site.materials.length > 5 && (
                          <p className="text-[10px] text-center text-slate-400 font-medium italic pt-2">+{site.materials.length - 5} more materials</p>
                        )}
                        {site.materials.length === 0 && (
                          <p className="text-xs text-center text-slate-300 italic py-4">No outbound movements recorded</p>
                        )}
                      </div>
                   </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>

      {/* Remaining Sections (Project Return Metrics & SSOT Audit) */}
      <section className="w-full h-auto min-h-0 block overflow-visible mt-10 space-y-8" id="inventory-remaining-sections">
        {/* Project Return Metrics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-heading italic tracking-tight text-slate-900">Project Return Metrics</h2>
              <p className="text-xs text-slate-500 font-medium">Overview of material flows returned from active project sites</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 w-full h-auto min-h-0">
             {/* Pending Returns */}
             <Card className="rounded-[2rem] border border-orange-500/30 shadow-xl shadow-orange-500/5 bg-orange-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-805 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                      PENDING
                    </Badge>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Returns</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.pendingReturns}</h3>
                </CardContent>
             </Card>

             {/* Returned Materials */}
             <Card className="rounded-[2rem] border border-emerald-500/30 shadow-xl shadow-emerald-500/5 bg-emerald-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-305 relative">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                      <Package className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-810 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                      PROCESSED
                    </Badge>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Returned Materials</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.returnedCount}</h3>
                </CardContent>
             </Card>

             {/* Return Value */}
             <Card className="rounded-[2rem] border border-blue-500/30 shadow-xl shadow-blue-500/5 bg-blue-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                      VALUE
                    </Badge>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Return Value</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">${metrics.returnValueTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                </CardContent>
             </Card>

             {/* Damaged Returns */}
             <Card className="rounded-[2rem] border border-red-500/30 shadow-xl shadow-red-500/5 bg-red-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="bg-red-50 border-red-200 text-red-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                      DAMAGED
                    </Badge>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Damaged Qty</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{metrics.damagedReturns}</h3>
                </CardContent>
             </Card>

             {/* Warehouse Recovery Value */}
             <Card className="rounded-[2rem] border border-violet-500/30 shadow-xl shadow-violet-500/5 bg-violet-50/30 backdrop-blur-md group hover:scale-[1.01] transition-all duration-300 relative">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-600">
                      <History className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="bg-violet-50 border-violet-200 text-violet-800 rounded-full px-2 py-0.5 font-bold text-[9px] shadow-xs">
                      RECOVERED
                    </Badge>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Warehouse Recovery Value</p>
                  <h3 className="text-2xl font-black text-violet-900 tracking-tight leading-none">${metrics.recoveryValueTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                </CardContent>
             </Card>
          </div>
        </div>

        {/* ERP SSOT Audit Section */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-heading italic tracking-tight text-orange-400">Main Warehouse SSOT Audit</h2>
              <p className="text-slate-400 text-xs font-medium">Compliance tracking for mandatory virtual flow: Vendor → Warehouse → Site</p>
            </div>
            <Badge className="bg-orange-600 hover:bg-orange-700 text-[10px] font-bold py-1 px-3 rounded-full">ENFORCED</Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Virtual Wh. Receipts</p>
              <div className="flex items-center justify-between">
                <h4 className="text-3xl font-black text-white italic">{metrics.virtualReceipts}</h4>
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><ArrowUpRight className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Warehouse Issues</p>
              <div className="flex items-center justify-between">
                <h4 className="text-3xl font-black text-white italic">{metrics.warehouseIssues}</h4>
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400"><ArrowDownRight className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Direct Site Deliveries</p>
              <div className="flex items-center justify-between">
                <h4 className="text-3xl font-black text-white italic">{metrics.directSiteDeliveries}</h4>
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Truck className="w-4 h-4" /></div>
              </div>
            </div>
            <div className="p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Site Receipts</p>
              <div className="flex items-center justify-between">
                <h4 className="text-3xl font-black text-white italic">{metrics.siteReceipts}</h4>
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><History className="w-4 h-4" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-md border border-white/40 shadow-2xl rounded-[2rem] p-8">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-black font-sans text-slate-950 tracking-tight flex items-center gap-2">
                  <FileText className="w-6 h-6 text-teal-600 animate-none mt-0.5" />
                  GRN Report Audit Details
                </DialogTitle>
                <DialogDescription className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">
                  Receipt Token: #{selectedGrn?.id}
                </DialogDescription>
              </div>
              {selectedGrn && (
                <Badge className={cn(
                  "rounded-full px-3 py-1 font-bold text-xs select-none border shadow-xs leading-none",
                  selectedGrn.status === 'APPROVED' ? "bg-emerald-50 text-emerald-800 border-emerald-200/50" :
                  selectedGrn.status === 'PENDING' ? "bg-amber-50 text-amber-800 border-amber-200/50" :
                  "bg-rose-50 text-rose-800 border-rose-200/50"
                )}>
                  {selectedGrn.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedGrn && (
            <div className="space-y-6 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 bg-slate-50/50 p-4 sm:p-6 rounded-2xl border border-slate-100 text-xs">
                 <div>
                    <Label className="text-[9px] uppercase font-bold tracking-widest text-slate-400">GRN No.</Label>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedGrn.grnNumber || 'N/A'}</p>
                 </div>
                 <div>
                    <Label className="text-[9px] uppercase font-bold tracking-widest text-slate-400">PO Reference</Label>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedGrn.poNumber || 'N/A'}</p>
                 </div>
                 <div>
                    <Label className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Challan Number</Label>
                    <p className="text-slate-800 font-medium mt-0.5">{selectedGrn.challanNumber || 'N/A'}</p>
                 </div>
                 <div>
                    <Label className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Project Name</Label>
                    <p className="text-slate-800 font-medium mt-0.5">{selectedGrn.projectName || 'N/A'}</p>
                 </div>
                 <div>
                    <Label className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Vendor</Label>
                    <p className="text-slate-800 font-medium mt-0.5">{selectedGrn.vendorName || 'N/A'}</p>
                 </div>
                 <div>
                    <Label className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Received On</Label>
                    <p className="text-slate-800 font-mono mt-1 text-[11px]">{safeFormatDate(selectedGrn.createdAt, 'dd MMM yyyy HH:mm')}</p>
                 </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Materials & Receipt Line Ledger</h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-xs overflow-x-auto">
                  <Table compact>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="font-bold text-[10px] text-slate-500 uppercase tracking-wider py-3">Material Describe / SKU</TableHead>
                        <TableHead className="text-right font-bold text-[10px] text-slate-500 uppercase tracking-wider py-3">Ordered Qty</TableHead>
                        <TableHead className="text-right font-bold text-[10px] text-slate-500 uppercase tracking-wider py-3">Received Qty</TableHead>
                        <TableHead className="text-right font-bold text-[10px] text-slate-500 uppercase tracking-wider text-rose-600 py-3">Rejected Qty</TableHead>
                        <TableHead className="text-center font-bold text-[10px] text-slate-500 uppercase tracking-wider py-3">QC Quality Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {selectedGrn.items && selectedGrn.items.length > 0 ? (
                        selectedGrn.items.map((item: any, idx: number) => {
                          const product = products.find(p => p.id === item.productId);
                          return (
                            <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                              <TableCell className="py-3">
                                 <p className="font-bold text-slate-900">{product?.name || 'Unknown Product'}</p>
                                 <p className="text-[9px] text-slate-400 font-mono mt-0.5">{product?.sku || item.productId}</p>
                              </TableCell>
                              <TableCell className="text-right text-slate-600 font-medium py-3">
                                {item.orderedQuantity} <span className="text-[10px] text-slate-400">{product?.uom || 'units'}</span>
                              </TableCell>
                              <TableCell className="text-right font-bold text-teal-600 py-3">
                                {item.receivedQuantity} <span className="text-[10px] text-slate-400">{product?.uom || 'units'}</span>
                              </TableCell>
                              <TableCell className="text-right text-rose-600 font-bold py-3">
                                {item.rejectedQuantity} <span className="text-[10px] text-slate-400">{product?.uom || 'units'}</span>
                              </TableCell>
                              <TableCell className="text-center py-3">
                                 <div className="flex flex-col items-center justify-center gap-1">
                                    <Badge className={cn(
                                      "text-[9px] h-4.5 rounded-full select-none font-bold scale-90 border shadow-2xs",
                                      item.qcStatus === 'PASSED' ? "bg-emerald-50 text-emerald-800 border-emerald-200/50" :
                                      item.qcStatus === 'PENDING' ? "bg-amber-50 text-amber-800 border-amber-200/50" :
                                      "bg-rose-50 text-rose-800 border-rose-200/50"
                                    )}>
                                      {item.qcStatus}
                                    </Badge>
                                    {item.qiRemark && (
                                      <span className="text-[9px] text-slate-400 italic max-w-[120px] truncate" title={item.qiRemark}>
                                        "{item.qiRemark}"
                                      </span>
                                    )}
                                 </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-slate-400 italic">
                             No itemized line details found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                 <Button 
                   onClick={() => setIsDetailOpen(false)}
                   className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-6 rounded-full shadow-md shadow-teal-600/10 transition-all text-xs"
                 >
                   Close Details
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="w-[95%] max-w-[450px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 sm:p-8 border-none bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-bold text-lg sm:text-xl">
              <AlertTriangle className="w-5 h-5" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="py-4 text-xs sm:text-sm">
              Are you sure you want to delete <span className="font-bold text-slate-900">{productToDelete?.name}</span>? 
              This will remove it from the catalog and all inventory summaries. This action is permanent.
            </DialogDescription>
            <div className="mt-2 p-3 sm:p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs sm:text-sm">
              <strong>Requirement:</strong> Type <span className="font-mono font-bold underline">DELETE</span> to confirm.
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label htmlFor="delete-confirm" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Confirmation</Label>
            <Input 
              id="delete-confirm"
              placeholder="Type DELETE..." 
              value={deleteConfirmationPhrase}
              onChange={(e) => setDeleteConfirmationPhrase(e.target.value)}
              className="rounded-xl h-12 border-slate-200"
            />
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-end gap-2.5">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-xl font-bold border-slate-200 w-full sm:w-auto h-11">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProduct}
              className="rounded-xl font-bold gap-2 px-6 shadow-lg shadow-red-500/20 w-full sm:w-auto h-11"
              disabled={deleteConfirmationPhrase !== 'DELETE' || isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Stock Dialog */}
      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="w-[95%] sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-4 sm:p-6 md:p-8 border-none bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold font-heading italic">Add Manual Stock Entry</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Directly inject inventory into the Main Warehouse.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Product <span className="text-red-500">*</span></Label>
              <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isProductPopoverOpen}
                      className="w-full justify-between rounded-xl border-slate-100 bg-slate-50/50 h-12 font-normal text-slate-600"
                    />
                  }
                >
                  {addStockForm.productId
                    ? products.find((p) => p.id === addStockForm.productId)?.name
                    : "Search Material..."}
                  <span className="flex items-center gap-2">
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-40px)] sm:w-[430px] p-0" align="start">
                  <div className="p-2 border-b border-slate-100">
                    <Input 
                      placeholder="Type name, SKU, or category..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-10 border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {filteredProductResults.length > 0 ? (
                      filteredProductResults.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => {
                            setAddStockForm(prev => ({ ...prev, productId: p.id }));
                            setIsProductPopoverOpen(false);
                            setProductSearch('');
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-900">{p.name} <span className="text-[10px] text-slate-400 font-mono">({p.sku})</span></span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{p.category} • {p.unit}</span>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] font-bold text-slate-900">{stocks.filter(s => s.productId === p.id && s.projectId === MAIN_WAREHOUSE_PROJECT_ID).reduce((acc, s) => acc + (s.quantity || 0), 0)} in stock</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center py-8">
                        <p className="text-sm text-slate-400 mb-4 italic">No matching material found</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-full gap-2 border-dashed border-primary text-primary hover:bg-primary/5"
                          onClick={() => {
                            setIsProductPopoverOpen(false);
                            setIsCreateProductOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3" /> Add New Material
                        </Button>
                      </div>
                    )}
                    {filteredProductResults.length > 0 && (
                       <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-2 h-10 mt-1 text-primary hover:text-primary hover:bg-primary/5 rounded-lg border-t border-slate-50 font-bold"
                        onClick={() => {
                          setIsProductPopoverOpen(false);
                          setIsCreateProductOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4" /> Create New Product
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity <span className="text-red-500">*</span></Label>
                <Input 
                  type="number" 
                  value={addStockForm.quantity}
                  onChange={(e) => setAddStockForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="rounded-xl border-slate-100 bg-slate-50/50 h-12"
                />
              </div>
              <div className="grid gap-2">
                <Label>Entry Type <span className="text-red-500">*</span></Label>
                <Select 
                  value={addStockForm.type} 
                  onValueChange={(v: any) => setAddStockForm(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MovementType.OPENING_STOCK}>Opening Stock</SelectItem>
                    <SelectItem value={MovementType.MANUAL_ADDITION}>Manual Addition</SelectItem>
                    <SelectItem value={MovementType.STOCK_ADJUSTMENT}>Physical Stock Adjustment</SelectItem>
                    <SelectItem value={MovementType.VENDOR_DIRECT_ENTRY}>Vendor Direct Entry</SelectItem>
                    <SelectItem value={MovementType.STOCK_CORRECTION}>Stock Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Reference Number (Optional)</Label>
              <Input 
                value={addStockForm.referenceNumber}
                onChange={(e) => setAddStockForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                placeholder="Bill No / Challan No"
                className="rounded-xl border-slate-100 bg-slate-50/50 h-12"
              />
            </div>

            <div className="grid gap-2">
              <Label>Remarks <span className="text-red-500">*</span></Label>
              <Input 
                value={addStockForm.remarks}
                onChange={(e) => setAddStockForm(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Reason for manual entry..."
                className="rounded-xl border-slate-100 bg-slate-50/50 h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStockOpen(false)} className="rounded-xl">Cancel</Button>
            <Button 
              onClick={handleAddStock} 
              disabled={isAdjustmentSubmitting}
              className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
            >
              {isAdjustmentSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
              Submit Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustStockOpen} onOpenChange={setIsAdjustStockOpen}>
        <DialogContent className="w-[95%] sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[2rem] p-4 sm:p-6 md:p-8 border-none bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold font-heading italic">Inventory Adjustment</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Modify existing quantities in the Main Warehouse.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Product <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between rounded-xl border-slate-100 bg-slate-50/50 h-12 font-normal text-slate-600"
                    />
                  }
                >
                  {adjustStockForm.productId
                    ? products.find((p) => p.id === adjustStockForm.productId)?.name
                    : "Search Material..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-40px)] sm:w-[430px] p-0" align="start">
                   <div className="p-2 border-b border-slate-100">
                    <Input 
                      placeholder="Type name, SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-10 border-none shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    {filteredProductResults.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          setAdjustStockForm(prev => ({ ...prev, productId: p.id }));
                          setProductSearch('');
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900">{p.name}</span>
                          <span className="text-[10px] text-slate-500">{p.sku}</span>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] font-bold text-slate-900">{stocks.filter(s => s.productId === p.id && s.projectId === MAIN_WAREHOUSE_PROJECT_ID).reduce((acc, s) => acc + (s.quantity || 0), 0)} in stock</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Quantity <span className="text-red-500">*</span></Label>
                <Input 
                  type="number" 
                  value={adjustStockForm.quantity}
                  onChange={(e) => setAdjustStockForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="rounded-xl border-slate-100 bg-slate-50/50 h-12"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Mode <span className="text-red-500">*</span></Label>
                <Select 
                  value={adjustStockForm.mode} 
                  onValueChange={(v: any) => setAdjustStockForm(prev => ({ ...prev, mode: v }))}
                >
                  <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCREMENT">Increase By (+)</SelectItem>
                    <SelectItem value="DECREMENT">Decrease By (-)</SelectItem>
                    <SelectItem value="SET">Correct To (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Remarks <span className="text-red-500">*</span></Label>
              <Input 
                value={adjustStockForm.remarks}
                onChange={(e) => setAdjustStockForm(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Reason for adjustment..."
                className="rounded-xl border-slate-100 bg-slate-50/50 h-12"
              />
            </div>
            
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
               <div className="flex gap-3">
                 <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                 <div className="text-xs text-amber-800 space-y-1">
                   <p className="font-bold">Important Notice</p>
                   <p>Manual adjustments are tracked in the stock ledger. Stock cannot become negative.</p>
                 </div>
               </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2.5">
            <Button variant="outline" onClick={() => setIsAdjustStockOpen(false)} className="rounded-xl w-full sm:w-auto h-12">Cancel</Button>
            <Button 
              onClick={handleAdjustStock} 
              disabled={isAdjustmentSubmitting}
              className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto h-12"
            >
              {isAdjustmentSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <History className="w-4 h-4 mr-2" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog (Mini Form) */}
      <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
        <DialogContent className="w-[95%] sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-4 sm:p-6 md:p-8 border-none bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tight text-slate-900 flex items-center gap-3 uppercase">
              <Plus className="w-8 h-8 text-emerald-600" /> New Material
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 text-xs sm:text-sm">Define a new product master record directly.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 py-4 sm:py-6">
             <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Product Name*</Label>
                <Input 
                  value={newProductForm.name} 
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. GI Pipe 1 Inch"
                  className="rounded-xl h-12 border-slate-100 bg-slate-50/50 focus-visible:ring-emerald-500"
                />
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">SKU (Auto-Generated if empty)</Label>
                <Input 
                  value={newProductForm.sku} 
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="Leave empty for auto"
                  className="rounded-xl h-12 border-slate-100 bg-slate-50/50 font-mono text-sm"
                />
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Category*</Label>
                <Select value={newProductForm.category} onValueChange={(v) => setNewProductForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="rounded-xl h-12 border-slate-100 bg-slate-50/50">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Unit of Measure*</Label>
                <Select value={newProductForm.unit} onValueChange={(v) => setNewProductForm(prev => ({ ...prev, unit: v }))}>
                  <SelectTrigger className="rounded-xl h-12 border-slate-100 bg-slate-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Each">Each (Nos)</SelectItem>
                    <SelectItem value="Kg">Kilogram (Kg)</SelectItem>
                    <SelectItem value="Mtr">Meter (Mtr)</SelectItem>
                    <SelectItem value="Sqft">Square Feet (Sqft)</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Material Type</Label>
                <Select value={newProductForm.materialType} onValueChange={(v) => setNewProductForm(prev => ({ ...prev, materialType: v }))}>
                  <SelectTrigger className="rounded-xl h-12 border-slate-100 bg-slate-50/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consumable">Consumable</SelectItem>
                    <SelectItem value="Asset">Asset / Tool</SelectItem>
                    <SelectItem value="Machinery">Machinery</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Min. Stock Level</Label>
                <Input 
                  type="number"
                  value={newProductForm.minStock} 
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                  className="rounded-xl h-12 border-slate-100 bg-slate-50/50"
                />
             </div>
             <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Estimate Unit Price</Label>
                <Input 
                  type="number"
                  value={newProductForm.unitPrice} 
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                  className="rounded-xl h-12 border-slate-100 bg-slate-50/50"
                />
             </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2.5">
            <Button variant="ghost" onClick={() => setIsCreateProductOpen(false)} className="rounded-xl h-12 px-6 font-bold w-full sm:w-auto">Cancel</Button>
            <Button 
              onClick={handleCreateProduct} 
              disabled={isProductCreating}
              className="rounded-xl h-12 px-10 font-black uppercase tracking-widest shadow-lg shadow-emerald-110 bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
            >
              {isProductCreating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-1" />}
              Create Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
