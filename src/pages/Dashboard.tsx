import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  Plus, 
  ArrowUpDown, 
  Filter, 
  Calendar, 
  ArrowRight, 
  QrCode, 
  Layers, 
  Box, 
  ShoppingCart,
  Search,
  Package,
  ClipboardList,
  AlertTriangle,
  FileCheck,
  History,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { UserRole, Product, PurchaseOrder, PurchaseRequisition, Stock, StockMovement, MovementType, MAIN_WAREHOUSE_PROJECT_ID } from '@/types';
import { cn } from '@/lib/utils';
import { ProductService, POService, PRService, InventoryService, MovementService } from '@/services/store';
import { toast } from 'sonner';


export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [poiList, setPoiList] = useState<PurchaseOrder[]>([]);
  const [prList, setPrList] = useState<PurchaseRequisition[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  
  // Date states for the pill inputs shown in the mockup
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubPos = POService.subscribe(setPoiList);
    const unsubPrs = PRService.subscribe(setPrList);
    const unsubStocks = InventoryService.subscribe(setStocks);
    const unsubMovements = MovementService.subscribe(setMovements);
    return () => {
      unsubProducts();
      unsubPos();
      unsubPrs();
      unsubStocks();
      unsubMovements();
    };
  }, []);

  // Compute live statistics based on real data
  const totalProducts = products.length;
  
  const totalPOs = poiList.length;
  const pendingPOs = poiList.filter(po => po.status === 'DRAFT').length;
  const approvedPOs = poiList.filter(po => po.status === 'APPROVED').length;
  const completedPOs = poiList.filter(po => po.status === 'RECEIVED' || po.status === 'CLOSED').length;
  const cancelledPOs = poiList.filter(po => po.status === 'REJECTED').length;
  
  const totalPRs = prList.length;
  const pendingPRs = prList.filter(pr => ['DRAFT', 'UNDER_REVIEW', 'PENDING_APPROVAL'].includes(pr.status)).length;
  const approvedPRs = prList.filter(pr => ['PM_APPROVED', 'ADMIN_APPROVED', 'CONVERTED_TO_PO'].includes(pr.status)).length;
  const rejectedPRs = prList.filter(pr => pr.status === 'REJECTED').length;
  
  const totalRevenueNumber = poiList.filter(po => ['APPROVED', 'SHIPPED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CLOSED'].includes(po.status)).reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalRevenue = totalRevenueNumber > 0 ? "₹" + totalRevenueNumber.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "₹0";

  // Warehouse Analytics
  const mainWarehouseStocks = stocks.filter(s => s.projectId === MAIN_WAREHOUSE_PROJECT_ID);
  const totalWarehouseStockQty = mainWarehouseStocks.reduce((sum, s) => sum + s.quantity, 0);
  
  const totalWarehouseStockValue = mainWarehouseStocks.reduce((sum, s) => {
    const p = products.find(prod => prod.id === s.productId);
    return sum + (s.quantity * (p?.unitPrice || 0));
  }, 0);
  
  const lowStockItems = mainWarehouseStocks.filter(s => {
    const product = products.find(p => p.id === s.productId);
    return product && s.quantity > 0 && s.quantity <= product.minStockLevel;
  }).length;
  const outOfStockItems = mainWarehouseStocks.filter(s => s.quantity === 0).length;

  // Project Site Analytics
  const projectStocks = stocks.filter(s => s.projectId !== MAIN_WAREHOUSE_PROJECT_ID);
  const totalSiteStock = projectStocks.reduce((sum, s) => sum + s.quantity, 0);
  
  const issuedMovements = movements.filter(m => m.type === MovementType.MATERIAL_ISSUE || m.type === MovementType.ISSUE_TO_SITE || m.type === MovementType.DIRECT_WAREHOUSE_ISSUE);
  const totalIssued = issuedMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
  
  const consumedMovements = movements.filter(m => m.type === MovementType.CONSUMPTION_ENTRY);
  const totalConsumed = consumedMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
  
  const returnedMovements = movements.filter(m => m.type === MovementType.RETURN_TO_STORE || m.type === MovementType.RETURN_TO_WAREHOUSE || m.type === MovementType.DAMAGED_RETURN || m.type === MovementType.EXCESS_RETURN || m.type === MovementType.RETURN_APPROVED);
  const totalReturned = returnedMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  // Best Selling Products (based on issue quantities)
  const productIssueMap: Record<string, { qty: number, revenue: number }> = {};
  issuedMovements.forEach(m => {
    if (!productIssueMap[m.productId]) {
      productIssueMap[m.productId] = { qty: 0, revenue: 0 };
    }
    const qty = Math.abs(m.quantity);
    productIssueMap[m.productId].qty += qty;
    
    // Estimate value
    const p = products.find(prod => prod.id === m.productId);
    if (p) {
      productIssueMap[m.productId].revenue += qty * (p.unitPrice || 0);
    }
  });
  
  const topIssuedProducts = Object.entries(productIssueMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([productId, data]) => {
      const p = products.find(prod => prod.id === productId);
      return {
        id: productId,
        name: p?.name || 'Unknown Product',
        sku: p?.sku || 'N/A',
        issuedQty: data.qty,
        value: "₹" + data.revenue.toLocaleString(),
        category: p?.category || 'General'
      };
    });

  const recentActivity = [...movements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);


  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-12 antialiased">
      {/* Title Header Section */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
          Dashboard
        </h1>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        
        {/* Card 1: Total Products */}
        <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-500 font-bold">Total Products</p>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 sm:mt-2 font-mono tracking-tight leading-none">{totalProducts}</h3>
            </div>
            <div className="flex items-center gap-2 mt-auto">
              <Button 
                onClick={() => navigate('/products')}
                className="bg-white/80 text-slate-800 hover:bg-white text-[10px] font-bold border border-white/60 h-7 px-3 rounded-full w-fit shadow-xs transition-colors"
               >
                <Plus className="w-3 h-3 mr-1 text-slate-800" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Purchase Requisitions */}
        <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-500 font-bold flex items-center gap-1 leading-tight"><ClipboardList className="w-3.5 h-3.5"/> Purchase Reqs</p>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono tracking-tight leading-none">{totalPRs}</h3>
            </div>
            <div className="flex gap-2 text-[10px] font-bold mt-auto items-center">
               <div className="flex flex-col">
                 <span className="text-amber-600">{pendingPRs} Pending</span>
                 <span className="text-emerald-600">{approvedPRs} Approved</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Purchase Orders */}
        <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-500 font-bold flex items-center gap-1 leading-tight"><ShoppingCart className="w-3.5 h-3.5"/> Purchase Orders</p>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono tracking-tight leading-none">{totalPOs}</h3>
            </div>
            <div className="flex gap-2 text-[10px] font-bold mt-auto items-center">
               <div className="flex flex-col">
                 <span className="text-amber-600">{pendingPOs} Pending</span>
                 <span className="text-emerald-600">{approvedPOs} Approved</span>
               </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Card 4: Revenue / Expenditure */}
        <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-500 font-bold flex items-center gap-1 leading-tight"><TrendingUp className="w-3.5 h-3.5"/> PO Value</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono tracking-tight leading-none">{totalRevenue}</h3>
            </div>
            <div className="flex gap-2 text-[10px] font-bold mt-auto items-center text-slate-500">
               Total successful orders
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Main Warehouse Inventory */}
        <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-40">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-slate-500 font-bold flex items-center gap-1 leading-tight"><Package className="w-3.5 h-3.5"/> Main Warehouse</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono tracking-tight leading-none">
                {totalWarehouseStockQty.toLocaleString()}
              </h3>
            </div>
            <div className="flex gap-2 text-[10px] font-bold mt-auto items-center">
               <div className="flex flex-col">
                 <span className="text-amber-600">{lowStockItems} Low Stock</span>
                 <span className="text-red-600">{outOfStockItems} Out of Stock</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Best Selling Products & Actions */}
      <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 pb-2 sm:pb-3 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Best Selling Products</h2>
          <div className="flex items-center gap-1 sm:gap-2 text-slate-600">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-600 hover:bg-white/40 rounded-full">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-600 hover:bg-white/40 rounded-full">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Date Filters Row */}
        <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 pt-1 sm:pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Start Date..."
                onFocus={(e) => e.target.type = 'date'}
                onBlur={(e) => e.target.type = 'text'}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 pr-2 h-10 rounded-full bg-white/60 border border-white/50 text-[11px] sm:text-xs text-slate-800 placeholder:text-slate-500 focus:bg-white/90 outline-none w-full sm:w-40 md:w-44 shadow-xs"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="End Date..."
                onFocus={(e) => e.target.type = 'date'}
                onBlur={(e) => e.target.type = 'text'}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9 pr-2 h-10 rounded-full bg-white/60 border border-white/50 text-[11px] sm:text-xs text-slate-800 placeholder:text-slate-500 focus:bg-white/90 outline-none w-full sm:w-40 md:w-44 shadow-xs"
              />
            </div>
          </div>
          <Button 
            className="h-10 px-5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold gap-1.5 focus:scale-95 transition-transform w-full sm:w-auto justify-center"
            onClick={() => { setStartDate(''); setEndDate(''); }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-none" />
            All Time
          </Button>
        </div>

        {/* Custom Pipe-Divided Data Table */}
        <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-8 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div className="min-w-[640px]">
            {topIssuedProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-medium">No Data Available</div>
            ) : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-900/60 pb-3 text-left">
                    <th className="py-2.5 font-bold text-slate-900 w-12 text-center">#</th>
                    <th className="py-2.5 font-bold text-slate-900 pl-2"><span className="text-slate-400 font-light mr-3">|</span> Product</th>
                    <th className="py-2.5 font-bold text-slate-900 pl-2"><span className="text-slate-400 font-light mr-3">|</span> SKU</th>
                    <th className="py-2.5 font-bold text-slate-900 pl-2"><span className="text-slate-400 font-light mr-3">|</span> Total Issued</th>
                    <th className="py-2.5 font-bold text-slate-900 pl-2"><span className="text-slate-400 font-light mr-3">|</span> Est. Value</th>
                    <th className="py-2.5 font-bold text-slate-900 pl-2"><span className="text-slate-400 font-light mr-3">|</span> Category</th>
                    <th className="py-2.5 font-bold text-slate-900 pl-2 w-16 text-center"><span className="text-slate-400 font-light mr-3">|</span> View</th>
                  </tr>
                </thead>
                <tbody>
                  {topIssuedProducts.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-200/50 py-2.5 hover:bg-slate-50/20 transition-colors group">
                      <td className="py-3 text-slate-700 font-mono text-center w-12">{idx + 1}</td>
                      <td className="py-3 text-slate-900 font-bold pl-2">
                        <span className="text-slate-350 font-light mr-3">|</span> 
                        {item.name}
                      </td>
                      <td className="py-3 text-slate-700 font-medium pl-2">
                        <span className="text-slate-350 font-light mr-3">|</span> 
                        {item.sku}
                      </td>
                      <td className="py-3 text-slate-700 font-bold pl-2">
                        <span className="text-slate-350 font-light mr-3">|</span> 
                        {item.issuedQty}
                      </td>
                      <td className="py-3 text-slate-700 font-medium pl-2">
                        <span className="text-slate-350 font-light mr-3">|</span> 
                        {item.value}
                      </td>
                      <td className="py-3 text-slate-700 font-medium pl-2">
                        <span className="text-slate-350 font-light mr-3">|</span> 
                        {item.category}
                      </td>
                      <td className="py-3 pl-2 text-center w-16">
                        <span className="text-slate-350 font-light mr-3">|</span> 
                        <button 
                          onClick={() => navigate('/products')}
                          className="cursor-pointer inline-flex items-center justify-center p-1.5 rounded-full hover:bg-white text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-xs"
                        >
                          <ArrowRight className="w-3.5 h-3.5 animate-none" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Card>

      {/* Bottom Section: Project Inventory & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md p-5 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Project Inventory</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/40 rounded-xl border border-white/50">
              <span className="text-sm font-bold text-slate-800">Total Materials Issued</span>
              <span className="text-lg font-black font-mono text-slate-900">{totalIssued.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/40 rounded-xl border border-white/50">
              <span className="text-sm font-bold text-slate-800">Total Materials Consumed</span>
              <span className="text-lg font-black font-mono text-slate-900">{totalConsumed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/40 rounded-xl border border-white/50">
              <span className="text-sm font-bold text-slate-800">Total Materials Returned</span>
              <span className="text-lg font-black font-mono text-slate-900">{totalReturned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-teal-600/10 rounded-xl border border-teal-500/20">
              <span className="text-sm font-bold text-teal-800">Current Site Stock</span>
              <span className="text-lg font-black font-mono text-teal-900">{totalSiteStock.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl sm:rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md p-5 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Recent Activity</h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-medium">No Recent Activity</div>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/60 pr-2">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex gap-3 items-start border-b border-white/30 pb-3 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs text-teal-600 font-bold text-[10px]">
                    {activity.type.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{activity.type.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] text-slate-600">{activity.productName} ({activity.quantity > 0 ? '+' : ''}{activity.quantity})</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
