import React, { useState, useEffect } from 'react';
import { InventoryService, ProductService, ProjectService } from '@/services/store';
import { Stock, Product, Project } from '@/types';
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

  const enrichedStocks = stocks.map(stock => ({
    ...stock,
    product: products.find(p => p.id === stock.productId),
    project: projects.find(p => p.id === stock.projectId)
  })).filter(s => {
    const matchesSearch = s.product?.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.project?.name.toLowerCase().includes(search.toLowerCase());
    const matchesProject = selectedProjectId === 'all' || s.projectId === selectedProjectId;
    return matchesSearch && matchesProject;
  });

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
        projectId: selectedStock.projectId,
        issueQuantity: qty,
        userId: user.uid,
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

      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                 placeholder="Search project or material..." 
                 className="pl-9 h-9" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
              />
           </div>
           
           <div className="flex items-center gap-2 w-full md:w-64">
              <span className="text-xs font-mono text-slate-400 uppercase shrink-0">Filter:</span>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="text-[10px] font-mono uppercase tracking-widest italic bg-slate-50">
              <TableHead>Project</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-sm">
            {enrichedStocks.map((stock) => {
              const isLow = stock.quantity <= (stock.product?.lowStockThreshold || 0);
              return (
                <TableRow key={stock.id}>
                  <TableCell className="font-medium">{stock.project?.name || 'Unknown'}</TableCell>
                  <TableCell className="font-semibold text-slate-900">{stock.product?.name || stock.productId}</TableCell>
                  <TableCell className="text-slate-500">{stock.product?.category}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                    {stock.quantity}
                  </TableCell>
                  <TableCell className="text-xs uppercase font-mono text-slate-400">{stock.product?.uom}</TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge className="bg-red-50 text-red-700 border-red-100 hover:bg-red-50">Low Stock</Badge>
                    ) : (
                      <Badge className="bg-green-50 text-green-700 border-green-100 hover:bg-green-50">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-500 font-mono italic">
                    {new Date(stock.lastUpdated).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1.5"
                      onClick={() => {
                        setSelectedStock(stock);
                        setIssueQuantity('');
                        setIsIssuing(true);
                      }}
                    >
                      <ArrowUpRight className="w-4 h-4" /> Issue
                    </Button>
                    {canAdjust && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5"
                        onClick={() => {
                          setSelectedStock(stock);
                          setNewQuantity((stock.quantity ?? 0).toString());
                          setIsAdjusting(true);
                        }}
                      >
                        <Settings2 className="w-4 h-4" /> Adjust
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">Product</p>
              <p className="font-semibold">{selectedStock?.product?.name}</p>
              <p className="text-xs text-slate-500 lowercase font-mono italic">{selectedStock?.project?.name}</p>
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
              <p className="font-semibold text-lg">{selectedStock?.product?.name}</p>
              <p className="text-xs text-slate-500 lowercase font-mono italic">{selectedStock?.project?.name}</p>
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
