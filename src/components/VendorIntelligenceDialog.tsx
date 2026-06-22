import React, { useState, useEffect, useMemo } from 'react';
import { MaterialPriceHistoryService, ProjectService, VendorService, ProductService } from '@/services/store';
import { MaterialPriceHistoryRecord, Project, Vendor, Product } from '@/types';
import { formatMaterialName } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart2, TrendingDown, TrendingUp, Calculator, FileSpreadsheet, Download, Search, History } from 'lucide-react';
import { format } from 'date-fns';

export function VendorIntelligenceDialog({ 
  initialMaterialId,
  trigger
  }: { 
  initialMaterialId?: string,
  trigger?: React.ReactElement | null
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<MaterialPriceHistoryRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [materials, setMaterials] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [filterMaterial, setFilterMaterial] = useState<string>(initialMaterialId || 'ALL');
  const [filterVendor, setFilterVendor] = useState<string>('ALL');
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (initialMaterialId) {
      setFilterMaterial(initialMaterialId);
    }
  }, [initialMaterialId]);

  // Reactive and clean subscription model inside useEffect
  useEffect(() => {
    if (!open) {
      return;
    }

    setIsLoading(true);

    // Track active subscriptions count for loading state resolution
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 4) {
        setIsLoading(false);
      }
    };

    const unsubHistory = MaterialPriceHistoryService.subscribe((data) => {
      setHistory(data as MaterialPriceHistoryRecord[]);
      checkLoaded();
    });

    const unsubProjects = ProjectService.subscribe((data) => {
      setProjects(data);
      checkLoaded();
    });

    const unsubVendors = VendorService.subscribe((data) => {
      setVendors(data);
      checkLoaded();
    });

    const unsubMaterials = ProductService.subscribe((data) => {
      setMaterials(data);
      checkLoaded();
    });

    // Timeout fallback for loading state in case of empty db collections
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      unsubHistory();
      unsubProjects();
      unsubVendors();
      unsubMaterials();
    };
  }, [open]);

  const handleResetFilters = () => {
    setFilterMaterial('ALL');
    setFilterVendor('ALL');
    setFilterProject('ALL');
    setFilterDate('');
    setSearchTerm('');
  };

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (filterMaterial !== 'ALL' && h.materialId !== filterMaterial) return false;
      if (filterVendor !== 'ALL' && h.vendorId !== filterVendor) return false;
      if (filterProject !== 'ALL' && h.projectId !== filterProject) return false;
      if (filterDate && !h.purchaseDate.startsWith(filterDate)) return false;
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesMaterial = h.materialName?.toLowerCase().includes(term);
        const matchesVendor = h.vendorName?.toLowerCase().includes(term);
        const matchesSku = h.sku?.toLowerCase().includes(term);
        return matchesMaterial || matchesVendor || matchesSku;
      }
      return true;
    });
  }, [history, filterMaterial, filterVendor, filterProject, filterDate, searchTerm]);

  // Memoized sorting of detailed history list to prevent continuous sorting on every draw frame
  const sortedDetailedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [filteredHistory]);

  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    
    let totalQuantity = 0;
    let totalAmount = 0;
    let highestPrice = -Infinity;
    let lowestPrice = Infinity;
    
    const vendorStats: Record<string, {
      vendorName: string;
      totalOrders: number;
      totalQuantity: number;
      totalAmount: number;
      minPrice: number;
      maxPrice: number;
      lastPrice: number;
      lastPurchaseDate: string;
    }> = {};

    let lastGlobalPurchaseDate = '';
    let lastGlobalVendor = '';

    const sortedHistory = [...filteredHistory].sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    sortedHistory.forEach(record => {
      totalQuantity += record.quantity;
      totalAmount += record.totalAmount;
      if (record.unitPrice > highestPrice) highestPrice = record.unitPrice;
      if (record.unitPrice < lowestPrice) lowestPrice = record.unitPrice;

      if (!vendorStats[record.vendorId]) {
        vendorStats[record.vendorId] = {
           vendorName: record.vendorName,
           totalOrders: 0,
           totalQuantity: 0,
           totalAmount: 0,
           minPrice: Infinity,
           maxPrice: -Infinity,
           lastPrice: 0,
           lastPurchaseDate: '',
        };
      }
      const vs = vendorStats[record.vendorId];
      vs.totalOrders += 1;
      vs.totalQuantity += record.quantity;
      vs.totalAmount += record.totalAmount;
      if (record.unitPrice < vs.minPrice) vs.minPrice = record.unitPrice;
      if (record.unitPrice > vs.maxPrice) vs.maxPrice = record.unitPrice;
      vs.lastPrice = record.unitPrice;
      vs.lastPurchaseDate = record.purchaseDate;
      
      lastGlobalPurchaseDate = record.purchaseDate;
      lastGlobalVendor = record.vendorName;
    });

    const averagePrice = totalAmount / totalQuantity;
    
    const vendorArray = Object.values(vendorStats).map(vs => ({
      ...vs,
      averagePrice: vs.totalAmount / vs.totalQuantity
    })).sort((a, b) => a.minPrice - b.minPrice);

    const bestVendor = vendorArray.length > 0 ? vendorArray[0] : null;

    let potentialSaving = 0;
    if (bestVendor && vendorArray.length > 1) {
      potentialSaving = averagePrice - bestVendor.minPrice;
    }

    return {
      averagePrice,
      highestPrice,
      lowestPrice,
      bestVendor,
      vendorArray,
      totalOrders: filteredHistory.length,
      totalQuantity,
      lastGlobalPurchaseDate,
      lastGlobalVendor,
      potentialSaving: Math.max(0, potentialSaving)
    };
  }, [filteredHistory]);

  const exportCSV = () => {
    if (!stats) return;
    const headers = ['Vendor Name', 'Total Orders', 'Total Qty', 'Average Price', 'Min Price', 'Max Price', 'Last Price', 'Last Purchase Date'];
    const rows = stats.vendorArray.map(v => [
      v.vendorName,
      v.totalOrders.toString(),
      v.totalQuantity.toString(),
      v.averagePrice.toFixed(2),
      v.minPrice.toFixed(2),
      v.maxPrice.toFixed(2),
      v.lastPrice.toFixed(2),
      v.lastPurchaseDate ? format(new Date(v.lastPurchaseDate), 'dd MMM yyyy') : '',
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Vendor_Intelligence.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? trigger : (
          <Button variant="outline" size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
             <BarChart2 className="w-4 h-4 mr-2" />
             Vendor Price Intelligence
          </Button>
      )} />
      <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border border-slate-200">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 shrink-0 bg-white">
          <DialogTitle className="text-2xl font-serif text-slate-900 flex items-center">
            <BarChart2 className="w-6 h-6 mr-3 text-indigo-600 animate-pulse" />
            Vendor Price Intelligence
          </DialogTitle>
          <div className="text-sm text-slate-500 mt-1 ml-9">
            Analyze historical material prices, vendor performance, and procurement savings in real-time.
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Material</label>
                <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-lg">
                     <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Materials</SelectItem>
                    {materials.map(m => <SelectItem key={m.id} value={m.id}>{formatMaterialName(m.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vendor</label>
                <Select value={filterVendor} onValueChange={setFilterVendor}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-lg">
                     <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Vendors</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Project</label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-lg">
                     <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date From</label>
                <div className="flex gap-2">
                  <Input 
                     type="date"
                     value={filterDate}
                     onChange={(e) => setFilterDate(e.target.value)}
                     className="w-full bg-slate-50 border-slate-200 rounded-lg"
                  />
                  {filterDate && (
                    <Button variant="ghost" onClick={() => setFilterDate('')} className="px-3" title="Clear Date">×</Button>
                  )}
                </div>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                     type="text"
                     placeholder="Search history..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-9 bg-slate-50 border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="shrink-0 w-full xl:w-auto flex flex-row gap-2">
                <Button 
                  variant="ghost" 
                  onClick={handleResetFilters} 
                  className="w-full xl:w-auto text-slate-500 hover:text-slate-800"
                >
                  Reset
                </Button>
                <Button variant="outline" onClick={exportCSV} disabled={!stats} className="w-full xl:w-auto bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm font-medium">
                  <Download className="w-4 h-4 mr-2 text-indigo-600" />
                  Export
                </Button>
              </div>
            </div>

            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
                  <p className="text-sm font-medium text-slate-500 animate-pulse">Streaming price analytics...</p>
               </div>
            ) : !stats ? (
               <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm">
                  <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <History className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">No purchase history available</h3>
                  <p className="text-slate-500 text-center max-w-md px-4 text-sm leading-relaxed">
                    Create a Purchase Order and process a Goods Receipt Note (GRN) to start tracking vendor prices and material cost trends automatically.
                  </p>
               </div>
            ) : (
              <div className="space-y-6">
                {/* Top Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <TrendingDown className="w-4 h-4 text-emerald-500 animate-bounce" /> Lowest Price
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-900">
                      ₹{stats.lowestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-colors">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-rose-500" /> Highest Price
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-900">
                      ₹{stats.highestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-colors">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                       <Calculator className="w-4 h-4 text-amber-500" /> Avg Price
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-900">
                      ₹{stats.averagePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                       <BarChart2 className="w-4 h-4 text-indigo-500" /> Latest Price
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-900 truncate">
                      ₹{stats.vendorArray.find(v => v.vendorName === stats.lastGlobalVendor)?.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                       <FileSpreadsheet className="w-4 h-4 text-blue-500" /> Total Purchases
                    </div>
                    <div className="text-2xl font-mono font-bold text-slate-900">
                      {stats.totalOrders}
                    </div>
                  </div>
                </div>

                {/* Vendor Comparison Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 text-sm tracking-wide">Vendor Performance Summary</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="font-semibold text-slate-600 h-10">Vendor</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10">Min Price</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10">Avg Price</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10">Max Price</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10">Last Price</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10">Total Qty</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10">Last Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.vendorArray.map((v, idx) => (
                          <TableRow key={v.vendorName} className={`${idx === 0 ? 'bg-emerald-50/20' : ''} border-slate-100 hover:bg-slate-50 transition-colors`}>
                            <TableCell className="py-3">
                              <div className="font-medium text-slate-900 flex items-center">
                                {v.vendorName}
                                {idx === 0 && <Badge variant="outline" className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200 px-1.5 py-0 text-[10px] font-bold tracking-wider">BEST RATE</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-emerald-600 bg-emerald-50/10 py-3">
                              ₹{v.minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono py-3 text-slate-700">
                              ₹{v.averagePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-rose-600 py-3">
                              ₹{v.maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-slate-900 py-3">
                              ₹{v.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-slate-600 py-3">
                              {v.totalQuantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-slate-500 py-3 font-medium text-xs">
                              {v.lastPurchaseDate ? format(new Date(v.lastPurchaseDate), 'dd MMM yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Detailed Purchase History Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 text-sm tracking-wide">Detailed Price Log</h3>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                    <Table>
                      <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="font-semibold text-slate-600 h-10 w-[120px] bg-white">Purchase Date</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-10 bg-white">Vendor</TableHead>
                          <TableHead className="font-semibold text-slate-600 h-10 bg-white">Material</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10 bg-white">Quantity</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10 bg-white">Unit Price</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10 bg-white">Prev. Price</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 h-10 bg-white">Diff</TableHead>
                          <TableHead className="text-center font-semibold text-slate-600 h-10 bg-white">Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedDetailedHistory.map(record => (
                          <TableRow key={record.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                            <TableCell className="py-3 text-slate-600 font-medium text-xs whitespace-nowrap">
                              {format(new Date(record.purchaseDate), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className="py-3 font-semibold text-slate-900">
                              {record.vendorName}
                            </TableCell>
                            <TableCell className="py-3 text-slate-600">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">{formatMaterialName(record.materialName)}</span>
                                {record.sku && <span className="text-[10px] text-slate-400 font-mono tracking-wider">{record.sku}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-right text-slate-700 font-mono text-sm">
                              {record.quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono font-bold text-slate-900">
                              ₹{record.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono text-slate-500">
                              {record.previousPrice ? `₹${record.previousPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono">
                              {record.previousPrice ? (
                                (() => {
                                  const diff = record.unitPrice - record.previousPrice;
                                  const percent = (diff / record.previousPrice) * 100;
                                  if (diff > 0) {
                                    return <span className="text-rose-600 flex items-center justify-end gap-1 font-bold text-xs"><TrendingUp className="w-3 h-3"/> +{percent.toFixed(1)}%</span>;
                                  } else if (diff < 0) {
                                    return <span className="text-emerald-600 flex items-center justify-end gap-1 font-bold text-xs"><TrendingDown className="w-3 h-3"/> {percent.toFixed(1)}%</span>;
                                  }
                                  return <span className="text-slate-400 font-bold text-xs">0%</span>;
                                })()
                              ) : '-'}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <Badge variant="outline" className={`font-semibold shadow-inner px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                                record.source === 'INITIAL' 
                                  ? 'bg-slate-50 text-slate-500 border-slate-200' 
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                              }`}>
                                {record.source === 'INITIAL' ? 'Initial' : 'Purchased'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
