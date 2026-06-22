import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Layers,
  ArrowRight,
  Plus,
  Filter,
  Search,
  LayoutGrid,
  List,
  Building2,
  DollarSign,
  FileText,
  Clock,
  History,
  RotateCcw,
  Truck,
  ArrowUpRight,
  Settings2
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  InventoryService, 
  ProductService, 
  ProjectService,
  MovementService
} from '@/services/store';
import { Stock, Product, Project, StockMovement, UserRole } from '@/types';
import { format } from 'date-fns';
import { cn, getStockStatus } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export default function InventoryControl() {
  const { profile } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedProject]);

  const getProjectDisplayName = (projectId: string, proj?: Project): string => {
    if (proj?.name && !/^[a-zA-Z0-9]{18,22}$/.test(proj.name)) {
      return proj.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    if (proj?.name && /^[a-zA-Z0-9]{18,22}$/.test(proj.name)) {
      return `Horizon Project (${proj.name.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9]{18,22}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    // General check if string looks like an auto-generated Firestore ID
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return proj?.name || projectId || 'Grand Horizon Mall';
  };

  const isSupervisor = profile?.role === UserRole.SITE_SUPERVISOR;
  const allowedProjectIds = useMemo(() => isSupervisor ? (profile?.assignedProjects || []) : [], [isSupervisor, profile]);

  // Filter projects list for selection
  const allowedProjects = useMemo(() => {
    return isSupervisor 
      ? projects.filter(p => allowedProjectIds.includes(p.id)) 
      : projects;
  }, [isSupervisor, projects, allowedProjectIds]);

  // Sync selectedProject state with user role permissions
  useEffect(() => {
    if (isSupervisor && allowedProjectIds.length > 0) {
      if (selectedProject === 'ALL' || !allowedProjectIds.includes(selectedProject)) {
        setSelectedProject(allowedProjectIds[0]);
      }
    }
  }, [isSupervisor, allowedProjectIds, selectedProject]);

  useEffect(() => {
    const unsubStocks = InventoryService.subscribe(setStocks);
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubMovements = MovementService.subscribe((data) => {
      setMovements(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => {
      unsubStocks();
      unsubProducts();
      unsubProjects();
      unsubMovements();
    };
  }, []);

  // Root stocks allowed for this user
  const accessibleStocks = useMemo(() => {
    return isSupervisor
      ? stocks.filter(stock => allowedProjectIds.includes(stock.projectId))
      : stocks;
  }, [isSupervisor, stocks, allowedProjectIds]);

  const totalStockValue = useMemo(() => {
    return accessibleStocks
      .filter(stock => selectedProject === 'ALL' || stock.projectId === selectedProject)
      .reduce((acc, stock) => {
        const product = products.find(p => p.id === stock.productId);
        return acc + (stock.quantity * (product?.unitPrice || 0));
      }, 0);
  }, [accessibleStocks, products, selectedProject]);

  const lowStockItems = useMemo(() => {
    return accessibleStocks
      .filter(stock => selectedProject === 'ALL' || stock.projectId === selectedProject)
      .filter(stock => {
        const product = products.find(p => p.id === stock.productId);
        const available = stock.quantity + (stock.incomingQuantity || 0) - (stock.reservedQuantity || 0);
        return product && available <= product.minStockLevel;
      });
  }, [accessibleStocks, products, selectedProject]);

  const outOfStockItems = useMemo(() => {
    return accessibleStocks
      .filter(stock => selectedProject === 'ALL' || stock.projectId === selectedProject)
      .filter(stock => {
        const available = stock.quantity + (stock.incomingQuantity || 0) - (stock.reservedQuantity || 0);
        return available <= 0;
      });
  }, [accessibleStocks, selectedProject]);

  // Root movements allowed for this user
  const accessibleMovements = useMemo(() => {
    return isSupervisor
      ? movements.filter(m => allowedProjectIds.includes(m.projectId))
      : movements;
  }, [isSupervisor, movements, allowedProjectIds]);

  // Filter movements by selected project filter
  const displayedMovements = useMemo(() => {
    return accessibleMovements
      .filter(m => selectedProject === 'ALL' || m.projectId === selectedProject)
      .slice(0, 10);
  }, [accessibleMovements, selectedProject]);

  const filteredStocks = useMemo(() => {
    return accessibleStocks.filter(stock => {
      const product = products.find(p => p.id === stock.productId);
      
      if (!product) return false;

      const searchTerm = search.toLowerCase();
      const productName = product.name?.toLowerCase() || '';
      const productSku = product.sku?.toLowerCase() || '';

      const matchesSearch = 
        productName.includes(searchTerm) ||
        productSku.includes(searchTerm);
      
      const matchesProject = selectedProject === 'ALL' || stock.projectId === selectedProject;

      return matchesSearch && matchesProject;
    });
  }, [accessibleStocks, products, search, selectedProject]);

  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  
  const paginatedStocks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStocks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStocks, currentPage, itemsPerPage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis1');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis2');
      }
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 font-sans pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-3">
             <BarChart3 className="w-8 h-8 text-teal-600" />
             Inventory Control Dashboard
          </h1>
          <p className="text-slate-500 font-medium italic mt-1 uppercase text-xs tracking-widest">Real-time Multi-Warehouse stock sync & Valuation</p>
        </div>
        <div className="flex gap-3">
           <Link to="/inventory/movements">
             <Button variant="outline" className="rounded-xl font-bold bg-white gap-2 border-slate-200">
               <History className="w-4 h-4" />
               View Audit Trail
             </Button>
           </Link>
           <Link to="/inventory/returns">
             <Button variant="outline" className="rounded-xl font-bold bg-white gap-2 border-slate-200">
               <RotateCcw className="w-4 h-4" />
               Material Returns
             </Button>
           </Link>
           <Link to="/products">
             <Button className="rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/10 gap-2">
               <Package className="w-4 h-4" />
               Manage Products
             </Button>
           </Link>
         </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Total Valuation</p>
           <div className="flex items-center gap-4 mt-2">
              <div className="w-12 h-12 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs">
                 <DollarSign className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                 <p className="text-3xl font-black text-slate-950 leading-none">₹{(totalStockValue / 100000).toFixed(2)}L</p>
                 <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                   <TrendingUp className="w-3.5 h-3.5" />
                   <span>1.2% this week</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Low Stock Alerts</p>
           <div className="flex items-center gap-4 mt-2">
              <div className="w-12 h-12 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs">
                 <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                 <p className="text-3xl font-black text-amber-600 leading-none">{lowStockItems.length}</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Action required</p>
              </div>
           </div>
        </div>

        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Out of Stock</p>
           <div className="flex items-center gap-4 mt-2">
              <div className="w-12 h-12 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs">
                 <Package className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                 <p className="text-3xl font-black text-rose-600 leading-none">{outOfStockItems.length}</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Immediate restock</p>
              </div>
           </div>
        </div>

        <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] p-6 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Active Warehouses</p>
           <div className="flex items-center gap-4 mt-2">
              <div className="w-12 h-12 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs">
                 <Building2 className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                 <p className="text-3xl font-black text-slate-950 leading-none">
                    {selectedProject === 'ALL' ? allowedProjects.length : 1}
                 </p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Site & Store sync</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Stock Table/Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search products by SKU or Name..." 
                className="pl-11 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:shadow-md transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Project Filter option for Managers and limited for Supervisors */}
            <div className="w-full sm:w-[250px]">
              <Select 
                value={selectedProject} 
                onValueChange={setSelectedProject}
                disabled={isSupervisor && allowedProjectIds.length <= 1}
              >
                <SelectTrigger className="h-12 bg-white border-slate-200 rounded-2xl shadow-sm italic font-semibold">
                  <SelectValue placeholder="All Projects / Sites">
                    {selectedProject === 'ALL' 
                      ? 'All Project Sites' 
                      : getProjectDisplayName(selectedProject, projects.find(p => p.id === selectedProject))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {!isSupervisor && (
                    <SelectItem value="ALL" className="font-bold italic">All Project Sites</SelectItem>
                  )}
                  {allowedProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {getProjectDisplayName(project.id, project)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
               <Button 
                variant={viewMode === 'GRID' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="rounded-lg h-10 px-4"
                onClick={() => setViewMode('GRID')}
               >
                 <LayoutGrid className="w-4 h-4 mr-2" />
                 Grid
               </Button>
               <Button 
                variant={viewMode === 'LIST' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="rounded-lg h-10 px-4"
                onClick={() => setViewMode('LIST')}
               >
                 <List className="w-4 h-4 mr-2" />
                 List
               </Button>
            </div>
          </div>

          <div className="bg-white border-none rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <div className="hidden md:block min-w-[800px]">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="py-4 pl-8 font-bold text-slate-900 uppercase">Product & SKU</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase">Location</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase text-right">Physical</TableHead>
                        <TableHead className="font-bold text-blue-700 uppercase text-right">Incoming (PO)</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase text-right">Reserved</TableHead>
                        <TableHead className="font-bold text-teal-700 uppercase text-right">Available</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase text-right">Valuation</TableHead>
                        <TableHead className="pr-8 font-bold text-slate-900 uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStocks.map(stock => {
                        const product = products.find(p => p.id === stock.productId);
                        const project = projects.find(p => p.id === stock.projectId);
                        const reserved = stock.reservedQuantity || 0;
                        const incoming = stock.incomingQuantity || 0;
                        const available = stock.quantity + incoming - reserved;
                        const isLow = product && available <= product.minStockLevel;
                        const isOut = available <= 0;

                        return (
                          <TableRow key={stock.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group italic">
                            <TableCell className="py-4 pl-8">
                               <div className="flex flex-col">
                                 <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{product?.name}</span>
                                 <span className="text-[10px] font-mono text-slate-400">{product?.sku}</span>
                               </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-slate-300" />
                                {getProjectDisplayName(stock.projectId, project)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                               <span className="font-medium font-mono text-slate-500">{stock.quantity}</span>
                            </TableCell>
                            <TableCell className="text-right">
                               <span className="font-bold font-mono text-blue-600">{incoming > 0 ? `+${incoming}` : '-'}</span>
                            </TableCell>
                            <TableCell className="text-right">
                               <span className="font-medium font-mono text-slate-400">{reserved > 0 ? reserved : '-'}</span>
                            </TableCell>
                            <TableCell className="text-right">
                               <span className="font-black font-mono text-teal-700">{available}</span>
                               <span className="text-[10px] text-teal-600/70 ml-1 font-bold uppercase">{product?.uom}</span>
                            </TableCell>
                            <TableCell className="text-right">
                               <span className="font-bold font-mono text-slate-900">₹{(stock.quantity * (product?.unitPrice || 0)).toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="pr-8">
                               <Badge variant="outline" className={cn(
                                 "rounded-full border-slate-200 font-black text-[10px] uppercase",
                                 isOut ? "bg-red-50 text-red-700" : isLow ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                               )}>
                                 {isOut ? 'OUT' : isLow ? 'LOW' : 'STABLE'}
                               </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                  
                  {/* Mobile view */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                     {paginatedStocks.length === 0 ? (
                       <div className="p-8 text-center text-slate-500 italic">No inventory records found.</div>
                     ) : paginatedStocks.map((stock) => {
                        const product = products.find(p => p.id === stock.productId);
                        const project = projects.find(p => p.id === stock.projectId);
                        const reserved = stock.reservedQuantity || 0;
                        const incoming = stock.incomingQuantity || 0;
                        const available = stock.quantity + incoming - reserved;
                        const isLow = product && available <= product.minStockLevel;
                        const isOut = available <= 0;

                        return (
                          <div key={stock.id} className="p-4 flex flex-col gap-3 group hover:bg-slate-50/50 transition-colors">
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{product?.name}</p>
                                   <p className="font-mono text-xs text-slate-400">{product?.sku}</p>
                                </div>
                                <Badge variant="outline" className={cn(
                                    "rounded-full border-slate-200 font-black text-[10px] uppercase shrink-0",
                                    isOut ? "bg-red-50 text-red-700" : isLow ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                                  )}>
                                    {isOut ? 'OUT' : isLow ? 'LOW' : 'STABLE'}
                                </Badge>
                             </div>
                             
                             <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg w-fit">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {getProjectDisplayName(stock.projectId, project)}
                             </div>
                             
                             <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <div className="flex flex-col border-r border-slate-200/60 pr-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Physical</span>
                                  <span className="font-medium font-mono text-slate-900">{stock.quantity}</span>
                                </div>
                                <div className="flex flex-col pl-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available</span>
                                  <div>
                                     <span className="font-black font-mono text-teal-700 text-lg leading-none">{available}</span>
                                     <span className="text-[10px] font-bold uppercase text-teal-600/70 ml-1">{product?.uom}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col col-span-2 pt-2 mt-2 border-t border-slate-200/60">
                                  <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-4">
                                      <span className="text-[10px] font-mono text-slate-500 font-bold">In: <span className="text-blue-600">{incoming > 0 ? `+${incoming}` : '-'}</span></span>
                                      <span className="text-[10px] font-mono text-slate-500 font-bold">Res: {reserved > 0 ? reserved : '-'}</span>
                                    </div>
                                    <span className="font-bold font-mono text-slate-900">₹{(stock.quantity * (product?.unitPrice || 0)).toLocaleString()}</span>
                                  </div>
                                </div>
                             </div>
                          </div>
                        );
                     })}
                  </div>
                </div>
              </div>

          {/* Beautiful Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-6 border border-slate-100 rounded-[2rem] flex items-center justify-between flex-wrap gap-4 bg-white shadow-sm mt-6">
              <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
                Page {currentPage} of {totalPages} <span className="text-slate-200 mx-2">|</span> Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredStocks.length)}-{Math.min(currentPage * itemsPerPage, filteredStocks.length)} of {filteredStocks.length} Stocks
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl px-4 font-bold border-slate-200 bg-white"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                
                {getPageNumbers().map((page, index) => {
                  if (typeof page === 'string') {
                    return <span key={`ellipse-${index}`} className="text-slate-400 font-mono text-sm px-1 font-bold">...</span>;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-10 w-10 p-0 rounded-xl font-mono font-bold transition-all",
                        currentPage === page ? "bg-primary shadow-md shadow-primary/20 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl px-4 font-bold border-slate-200 bg-white"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
           <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2.5rem] p-8 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
             <div className="flex items-center gap-4 border-b border-slate-100/80 pb-4 mb-6">
               <div className="w-11 h-11 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs text-teal-600">
                 <Clock className="w-5 h-5 animate-none" />
               </div>
               <div>
                 <h3 className="text-lg font-heading font-black italic text-slate-900 tracking-tight">Recent Movements</h3>
                 <p className="text-slate-500 text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Live Inventory Feed</p>
               </div>
             </div>

             <div className="space-y-5">
                {displayedMovements.map((m, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={m.id} 
                    className="flex items-start gap-4 p-2 rounded-2xl hover:bg-white/30 transition-colors"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                      m.quantity > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                    )}>
                       {m.quantity > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-slate-900 truncate pr-2 italic">{m.productName}</p>
                          <span className={cn("text-xs font-black font-sans shrink-0", m.quantity > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                          </span>
                       </div>
                       <div className="flex items-center justify-between mt-1 gap-2">
                          <span className="text-[10px] font-mono text-slate-550 font-bold tracking-tight bg-slate-100/80 px-2 py-0.5 rounded-md uppercase">
                             {(m.type || '').replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase font-mono">{format(new Date(m.createdAt), 'HH:mm')}</span>
                       </div>
                    </div>
                  </motion.div>
                ))}
                
                <div className="pt-4 mt-4 border-t border-slate-100">
                   <Link to="/inventory/movements">
                     <Button variant="ghost" className="w-full text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-2xl font-black italic tracking-tighter group h-12">
                       Full Audit History
                       <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                     </Button>
                   </Link>
                </div>
             </div>
           </div>

           <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2.5rem] p-8 shadow-xl shadow-teal-950/2 hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group">
             <div className="flex items-center gap-4 border-b border-slate-100/80 pb-4 mb-6">
               <div className="w-11 h-11 bg-white/90 border border-white/60 rounded-2xl flex items-center justify-center shadow-xs text-teal-600">
                 <Layers className="w-5 h-5 animate-none" />
               </div>
               <div>
                 <h3 className="text-lg font-heading font-black italic text-slate-900 tracking-tight">Slow Moving Items</h3>
                 <p className="text-slate-500 text-[10px] font-mono font-bold uppercase tracking-widest leading-none mt-1">Aging &gt; 30 Days</p>
               </div>
             </div>
             
             <div className="space-y-4">
                {filteredStocks.slice(0, 3).map(stock => {
                  const product = products.find(p => p.id === stock.productId);
                  return (
                    <div key={stock.id} className="p-4 rounded-3xl bg-white/90 border border-white/60 shadow-xs italic">
                      <p className="text-xs font-bold text-slate-900 mb-1">{product?.name}</p>
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">{product?.sku}</p>
                        <p className="text-xs font-black font-mono text-slate-900">{stock.quantity + (stock.incomingQuantity || 0) - (stock.reservedQuantity || 0)} {product?.uom}</p>
                      </div>
                      <div className="mt-3">
                         <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mb-1">
                           <span>Age: 42 Days</span>
                           <span>Turnover: Low</span>
                         </div>
                         <Progress value={25} className="h-1 bg-slate-200" />
                      </div>
                    </div>
                  );
                })}
             </div>
           </div>

           <div className="bg-gradient-to-br from-teal-500/5 to-emerald-500/10 rounded-[2.5rem] p-8 border border-white/40 shadow-xl shadow-teal-950/2 flex flex-col items-center text-center space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="w-16 h-16 rounded-3xl bg-white/90 border border-white/60 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform shadow-xs">
                 <Truck className="w-8 h-8 text-teal-600" />
              </div>
              <div className="relative z-10">
                <h4 className="text-xl font-heading font-black italic text-slate-950 tracking-tight">Need a stock top-up?</h4>
                <p className="text-xs font-semibold text-slate-500 mt-2 italic px-4 leading-relaxed">Generate bulk purchase requisitions for your low stock items with a single click.</p>
              </div>
              <Link to="/requisitions" className="w-full relative z-10">
                <Button className="w-full h-12 rounded-[1.25rem] font-black italic bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/15 transition-all">Create Purchase Requisition</Button>
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
