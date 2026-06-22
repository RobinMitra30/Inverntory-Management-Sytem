import React, { useState, useEffect } from 'react';
import { InventoryService, ProductService, ProjectService } from '@/services/store';
import { Stock, Product, Project, MAIN_WAREHOUSE_PROJECT_ID } from '@/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, AlertTriangle, ArrowUpRight, Settings2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function InventoryPage() {
  const { profile, user } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedProjectId, selectedCategory]);

  // Filter projects based on user role
  const filteredProjects = profile?.role === UserRole.SITE_SUPERVISOR 
    ? projects.filter(p => profile.assignedProjects.includes(p.id)) 
    : projects;

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [issueQuantity, setIssueQuantity] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubStock = InventoryService.subscribe(setStocks);
    const unsubProduct = ProductService.subscribe(setProducts);
    const unsubProject = ProjectService.subscribe(setProjects);
    return () => { unsubStock(); unsubProduct(); unsubProject(); };
  }, []);

  const getProductDisplayName = (productId: string, product?: Product): string => {
    if (product?.name) return product.name;
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'OPC Cement 53 Grade',
    };
    if (defaultMappings[productId]) return defaultMappings[productId];
    if (/^[a-zA-Z0-9]{18,22}$/.test(productId)) {
      return `Unspecified Material (${productId.substring(0, 6)})`;
    }
    return productId;
  };

  const getProjectDisplayName = (projectId: string, project?: Project): string => {
    const isRawId = (str?: string) => {
      if (!str) return true;
      if (str.includes(' ')) return false;
      return /^[a-zA-Z0-9_-]{5,30}$/.test(str);
    };
    if (project?.name && !isRawId(project.name)) {
      return project.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    if (project?.name && isRawId(project.name)) {
      return `Horizon Project (${project.name.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return project?.name || projectId || 'Grand Horizon Mall';
  };

  const enrichedStocks = stocks.map(stock => ({
    ...stock,
    product: products.find(p => p.id === stock.productId),
    project: projects.find(p => p.id === stock.projectId)
  })).filter(s => {
    const displayName = getProductDisplayName(s.productId, s.product);
    const productName = displayName.toLowerCase();
    const productSku = s.product?.sku?.toLowerCase() || '';
    const searchTerm = search.toLowerCase();

    const matchesSearch = search === '' || 
                          productName.includes(searchTerm) || 
                          productSku.includes(searchTerm);
    const matchesProject = selectedProjectId === 'all' || s.projectId === selectedProjectId;
    const matchesCategory = selectedCategory === 'all' || (s.product?.category || (s.productId === 'pMUUAjtOuJ8BjHiHoBgY' ? 'Cement' : 'Other')) === selectedCategory;
    return matchesSearch && matchesProject && matchesCategory;
  });

  const totalPages = Math.ceil(enrichedStocks.length / itemsPerPage);
  const paginatedStocks = enrichedStocks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const clearFilters = () => {
    setSearch('');
    setSelectedProjectId('all');
    setSelectedCategory('all');
  };

  const canAdjust = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER || profile?.role === UserRole.STORE_KEEPER;

  const handleAdjust = async () => {
    if (!selectedStock || !user) return;
    const qty = parseFloat(newQuantity);
    if (isNaN(qty)) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      await InventoryService.adjustStock({
        productId: selectedStock.productId,
        projectId: selectedStock.projectId,
        newQuantity: qty,
        userId: user.uid,
        userName: profile?.name || 'System',
        remarks: remarks || 'Manual adjustment'
      });
      toast.success('Stock adjusted successfully');
      setIsAdjusting(false);
      setSelectedStock(null);
      setRemarks('');
    } catch (err) {
      toast.error('Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssue = async () => {
    if (!selectedStock || !user) return;
    const qty = parseFloat(issueQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid issue quantity');
      return;
    }

    if (qty > (selectedStock.quantity || 0)) {
       toast.error('Insufficient stock available');
       return;
    }

    setIsSubmitting(true);
    try {
      await InventoryService.issueStock({
        productId: selectedStock.productId,
        fromProjectId: MAIN_WAREHOUSE_PROJECT_ID, // Assuming we issue FROM warehouse
        toProjectId: selectedStock.projectId,
        issueQuantity: qty,
        userId: user.uid,
        userName: profile?.name || 'System',
        remarks: remarks || 'Material issue'
      });
      toast.success('Material issued successfully');
      setIsIssuing(false);
      setSelectedStock(null);
      setRemarks('');
      setIssueQuantity('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue material');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Inventory Control</h1>
        <p className="text-slate-500 text-sm">Real-time material tracking across all projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-sm">
           <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">Stock Breakdown</h3>
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                 <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                 <p className="text-2xl font-semibold">{enrichedStocks.length}</p>
                 <p className="text-xs text-slate-500 uppercase font-mono">Active SKU-Project Pairs</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 border border-slate-200 rounded-sm">
           <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">Value on Site</h3>
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                 <ArrowUpRight className="w-6 h-6 text-green-600" />
              </div>
              <div>
                 <p className="text-2xl font-semibold">₹{(stocks.length * 12500).toLocaleString()}</p>
                 <p className="text-xs text-slate-500 uppercase font-mono">Estimated Stock Value</p>
              </div>
           </div>
        </div>
        <div className="bg-white p-6 border border-slate-200 rounded-sm">
           <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">Critical Stock</h3>
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                 <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                 <p className="text-2xl font-semibold">
                   {enrichedStocks.filter(s => s.quantity <= (s.product?.lowStockThreshold || 0)).length}
                 </p>
                 <p className="text-xs text-slate-500 uppercase font-mono">SKUs below threshold</p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white border-none rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input 
                 placeholder="Search by name or code..." 
                 className="pl-9 h-12 rounded-2xl bg-slate-50/50 border-slate-100" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
              />
           </div>
           
           <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-12 w-[180px] rounded-xl border-slate-100 bg-slate-50/50">
                  <SelectValue placeholder="All Projects">
                    {selectedProjectId === 'all' 
                      ? 'All Projects' 
                      : getProjectDisplayName(selectedProjectId, projects.find(p => p.id === selectedProjectId))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {filteredProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{getProjectDisplayName(p.id, p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 w-[180px] rounded-xl border-slate-100 bg-slate-50/50">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={clearFilters} variant="ghost" className="h-12 px-4 rounded-xl">Clear</Button>
           </div>
        </div>
        <div className="bg-white border-none rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="hidden md:block min-w-full">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100">
                  <TableHead className="py-4 pl-8 font-bold text-slate-900 uppercase">Project</TableHead>
                  <TableHead className="font-bold text-slate-900 uppercase">Product</TableHead>
                  <TableHead className="font-bold text-slate-900 uppercase">Category</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 uppercase">Quantity</TableHead>
                  <TableHead className="font-bold text-slate-900 uppercase">UOM</TableHead>
                  <TableHead className="font-bold text-slate-900 uppercase">Status</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 uppercase">Last Updated</TableHead>
                  <TableHead className="text-right pr-8 font-bold text-slate-900 uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStocks.map((stock) => {
                  const isLow = stock.quantity <= (stock.product?.lowStockThreshold || 0);
                  return (
                    <TableRow key={stock.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-4 pl-8 font-bold text-slate-900">{getProjectDisplayName(stock.projectId, stock.project)}</TableCell>
                      <TableCell className="font-bold text-slate-900">{getProductDisplayName(stock.productId, stock.product)}</TableCell>
                      <TableCell className="text-slate-600">{stock.product?.category || (stock.productId === 'pMUUAjtOuJ8BjHiHoBgY' ? 'Cement' : 'Other')}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${isLow ? 'text-red-700' : 'text-slate-900'}`}>
                        {stock.quantity}
                      </TableCell>
                      <TableCell className="text-xs uppercase font-mono text-slate-500">{stock.product?.uom}</TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 text-red-700 font-bold text-[10px] uppercase">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full border-green-200 bg-green-50 text-green-700 font-bold text-[10px] uppercase">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500 font-medium">
                        {new Date(stock.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-8 flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-10 w-10 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-orange-600 transition-colors"
                          onClick={() => {
                            setSelectedStock(stock);
                            setIssueQuantity('');
                            setIsIssuing(true);
                          }}
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                        {canAdjust && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                            onClick={() => {
                              setSelectedStock(stock);
                              setNewQuantity((stock.quantity ?? 0).toString());
                              setIsAdjusting(true);
                            }}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            {/* Mobile View */}
            <div className="md:hidden flex flex-col p-4 gap-4">
              {paginatedStocks.map((stock) => {
                const isLow = stock.quantity <= (stock.product?.lowStockThreshold || 0);
                return (
                  <div key={stock.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{getProductDisplayName(stock.productId, stock.product)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{getProjectDisplayName(stock.projectId, stock.project)}</p>
                      </div>
                      <Badge variant="outline" className={`rounded-full font-bold text-[9px] uppercase ${isLow ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                       <span className="text-xs text-slate-500">{stock.product?.category || (stock.productId === 'pMUUAjtOuJ8BjHiHoBgY' ? 'Cement' : 'Other')}</span>
                       <div className="text-right">
                          <span className={`text-lg font-mono font-bold ${isLow ? 'text-red-700' : 'text-slate-900'}`}>{stock.quantity}</span>
                          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">{stock.product?.uom}</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{new Date(stock.lastUpdated).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 shadow-sm rounded-lg hover:border-orange-200 hover:text-orange-600 bg-white" onClick={() => { setSelectedStock(stock); setIssueQuantity(''); setIsIssuing(true); }}>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                        {canAdjust && (
                          <Button variant="outline" size="sm" className="h-8 shadow-sm rounded-lg hover:border-blue-200 hover:text-blue-600 bg-white" onClick={() => { setSelectedStock(stock); setNewQuantity((stock.quantity ?? 0).toString()); setIsAdjusting(true); }}>
                            <Settings2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-4 font-bold border-slate-200 bg-white hover:bg-slate-50"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              
              {getPageNumbers().map((page, index) => {
                if (typeof page === 'string') {
                  return <span key={`ellipse-${index}`} className="text-slate-400 px-2">...</span>;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className={`h-10 w-10 p-0 rounded-xl font-bold transition-all ${
                      currentPage === page ? "bg-primary shadow-sm text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-4 font-bold border-slate-200 bg-white hover:bg-slate-50"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">Product</p>
              <p className="font-semibold">{getProductDisplayName(selectedStock?.productId, selectedStock?.product)}</p>
              <p className="text-xs text-slate-500 lowercase font-mono italic">{getProjectDisplayName(selectedStock?.projectId, selectedStock?.project)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">New Quantity ({selectedStock?.product?.uom})</Label>
              <Input 
                id="quantity"
                type="number" 
                value={newQuantity}
                onChange={e => setNewQuantity(e.target.value)}
                placeholder="Enter new stack count..."
              />
              <p className="text-[10px] text-slate-400 font-mono italic">Original count: {selectedStock?.quantity}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Adjustment Reason</Label>
              <Textarea 
                id="remarks"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Why is this stock being adjusted?"
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjusting(false)}>Cancel</Button>
            <Button 
              onClick={handleAdjust} 
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Updating...' : 'Commit Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isIssuing} onOpenChange={setIsIssuing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Material to Site</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">Product</p>
              <p className="font-semibold text-lg">{getProductDisplayName(selectedStock?.productId, selectedStock?.product)}</p>
              <p className="text-xs text-slate-500 lowercase font-mono italic">{getProjectDisplayName(selectedStock?.projectId, selectedStock?.project)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-quantity">Quantity to Issue ({selectedStock?.product?.uom})</Label>
              <Input 
                id="issue-quantity"
                type="number" 
                value={issueQuantity}
                onChange={e => setIssueQuantity(e.target.value)}
                placeholder="Enter amount to release..."
              />
              <p className="text-[10px] text-slate-400 font-mono italic">Available in stock: <span className="font-bold text-slate-900">{selectedStock?.quantity}</span></p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-remarks">Issuance Details (Location/Task)</Label>
              <Textarea 
                id="issue-remarks"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="e.g., Issued to Floor 2 concrete works"
                className="resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIssuing(false)}>Cancel</Button>
            <Button 
              onClick={handleIssue} 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
