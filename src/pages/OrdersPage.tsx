import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { POService, ProjectService, VendorService, ProductService, MaterialPriceHistoryService } from '@/services/store';
import { PurchaseOrder, Project, Vendor, Product, POLineItem, UserRole } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, FilePlus, Filter, Plus, Trash2, Store, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialSelector } from '@/components/MaterialSelector';
import { VendorSelector } from '@/components/VendorSelector';
import { PriceComparisonBadge } from '@/components/PriceComparisonBadge';

import { VendorIntelligenceDialog } from '@/components/VendorIntelligenceDialog';

export default function OrdersPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const getProjectDisplayName = (projectId: string, proj?: Project): string => {
    const isRawId = (str?: string) => {
      if (!str) return true;
      if (str.includes(' ')) return false;
      return /^[a-zA-Z0-9_-]{5,30}$/.test(str);
    };
    if (proj?.name && !isRawId(proj.name)) {
      return proj.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    if (proj?.name && isRawId(proj.name)) {
      return `Horizon Project (${proj.name.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return proj?.name || projectId || 'Grand Horizon Mall';
  };

  // New PO State
  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [taxPercent, setTaxPercent] = useState(18);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState<{ productId: string; quantityOrdered: number; unitPrice: number }[]>([]);

  useEffect(() => {
    const unsubPo = POService.subscribe(setPos);
    const unsubProject = ProjectService.subscribe(setProjects);
    const unsubVendor = VendorService.subscribe(setVendors);
    const unsubProduct = ProductService.subscribe(setProducts);
    return () => { unsubPo(); unsubProject(); unsubVendor(); unsubProduct(); };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (projectIdParam) {
      if (isMounted) setProjectId(projectIdParam);
    }
    return () => { isMounted = false; };
  }, [projectIdParam]);

  const isManagerOrAdmin = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER;

  if (profile && !isManagerOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh] bg-white rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-inner">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 font-serif">Access Restricted</h2>
        <p className="text-slate-500 max-w-md mt-2 text-sm leading-relaxed">
          Only Project Managers and Administrators are permitted to view and manage Purchase Orders and pricing information.
        </p>
      </div>
    );
  }

  const filteredPos = projectIdParam 
    ? pos.filter(po => po.projectId === projectIdParam)
    : pos;

  useEffect(() => {
    setCurrentPage(1);
  }, [projectIdParam]);

  const totalPages = Math.ceil(filteredPos.length / itemsPerPage);
  
  const enrichedPos = filteredPos.map(po => ({
    ...po,
    project: projects.find(p => p.id === po.projectId),
    vendor: vendors.find(v => v.id === po.vendorId)
  }));

  const paginatedEnrichedPos = enrichedPos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const addItem = () => {
    setItems([...items, { productId: '', quantityOrdered: 0, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, curr) => acc + (curr.quantityOrdered * curr.unitPrice), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const withTax = subtotal * (1 + taxPercent / 100);
    return Math.max(0, withTax - discountAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !vendorId || items.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const year = new Date().getFullYear();
      const random = Math.floor(100 + Math.random() * 900);
      const poNumber = `PO-${year}-${random}`;

      let needsVerification = false;
      let highestIncrease = 0;
      const flaggedItems = [];
      let hasWarning = false;

      for (const item of items) {
        const stats = await MaterialPriceHistoryService.getMaterialStats(item.productId);
        if (stats && stats.lastPrice > 0) {
          const percentIncrease = ((item.unitPrice - stats.lastPrice) / stats.lastPrice) * 100;
          if (percentIncrease > 15) {
            needsVerification = true;
            if (percentIncrease > highestIncrease) {
              highestIncrease = percentIncrease;
            }
            const product = products.find(p => p.id === item.productId);
            flaggedItems.push({
              productId: item.productId,
              productName: product?.name || 'Unknown',
              currentPrice: item.unitPrice,
              previousPrice: stats.lastPrice,
              percentageIncrease: percentIncrease
            });
          } else if (percentIncrease > 10) {
            hasWarning = true;
          }
        }
      }

      let poStatus: PurchaseOrder['status'] = 'DRAFT';
      let priceVerification;

      if (needsVerification) {
        poStatus = 'PRICE_VERIFICATION_REQUIRED';
        priceVerification = {
          highestPercentageIncrease: highestIncrease,
          flaggedItems
        };
        toast.error('Price Verification Required: Purchase price exceeds history by >15%');
      } else if (hasWarning) {
        toast.warning('⚠ Warning: Manager Approval Recommended (Price increased >10%)', { duration: 6000 });
      }

      await POService.add({
        poNumber,
        projectId,
        vendorId,
        status: poStatus,
        items: items.map(i => ({ ...i, quantityReceived: 0 })),
        taxPercent,
        discountAmount,
        totalAmount: calculateTotal(),
        createdAt: new Date().toISOString(),
        ...(priceVerification ? { priceVerification } : {})
      });
      if (!needsVerification) {
        toast.success(`Purchase Order ${poNumber} created successfully`);
      }
      setIsAddOpen(false);
      setItems([]);
      setProjectId(projectIdParam || '');
      setVendorId('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create PO');
    }
  };

  const handleUpdateStatus = async (status: PurchaseOrder['status']) => {
    if (!selectedPo) return;
    try {
      await POService.updateStatus(selectedPo, status);
      toast.success(`PO status updated to ${status}`);
      setIsDetailOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep="PO" />
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Purchase Orders</h1>
          <p className="text-slate-500 text-sm">Track official orders and vendor performance.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-orange-600 hover:bg-orange-700 h-10 gap-2">
              <FilePlus className="w-4 h-4" /> Create PO
            </Button>
          } />
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Project">
                        {projectId ? getProjectDisplayName(projectId, projects.find(p => p.id === projectId)) : 'Select Project'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{getProjectDisplayName(p.id, p)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <VendorSelector 
                    vendors={vendors}
                    selectedVendorId={vendorId}
                    onSelect={setVendorId}
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-slate-50 p-2 rounded-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest italic">Order Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
                       <Plus className="w-3 h-3" /> Add Item
                    </Button>
                 </div>

                 {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-end border-b border-slate-100 pb-5">
                        <div className="flex-1 space-y-2">
                           <Label className="text-[10px] uppercase font-mono flex items-center justify-between">
                             <span>Product</span>
                             {item.productId && (
                               <VendorIntelligenceDialog initialMaterialId={item.productId} />
                             )}
                           </Label>
                           <MaterialSelector 
                              products={products}
                              selectedProductId={item.productId}
                              onSelect={(v) => updateItem(idx, 'productId', v)}
                           />
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                           <div className="w-full sm:w-24 space-y-2">
                              <Label className="text-[10px] uppercase font-mono">Qty</Label>
                              <Input 
                                 type="number" 
                                 className="h-9" 
                                 value={isNaN(item.quantityOrdered) ? '' : item.quantityOrdered} 
                                 onChange={(e) => updateItem(idx, 'quantityOrdered', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                              />
                           </div>
                           <div className="w-full sm:w-32 space-y-2">
                              <Label className="text-[10px] uppercase font-mono flex items-center">
                                Unit Price
                                {item.productId && item.unitPrice > 0 && <PriceComparisonBadge materialId={item.productId} currentPrice={item.unitPrice} />}
                              </Label>
                              <Input 
                                 type="number" 
                                 className="h-9" 
                                 value={isNaN(item.unitPrice) ? '' : item.unitPrice} 
                                 onChange={(e) => updateItem(idx, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                              />
                           </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600 self-end shrink-0" onClick={() => removeItem(idx)}>
                           <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                 ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-4">
                  <div className="space-y-2 text-right border rounded p-4 bg-slate-50/30">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 uppercase font-mono text-[10px]">Subtotal:</span>
                      <span className="font-bold">₹{calculateSubtotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-mono">Tax (%)</Label>
                      <Input type="number" className="h-9" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-mono">Discount (Amt)</Label>
                      <Input type="number" className="h-9" value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="bg-slate-900 text-white p-4 rounded-sm flex justify-between items-center">
                    <span className="text-xs uppercase font-mono tracking-widest text-slate-400">Total payable</span>
                    <span className="text-xl font-bold font-mono tracking-tight">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 flex-1 h-11">Review & Confirm PO</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border-none rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex gap-4">
             <Button variant="outline" size="sm" className="h-10 rounded-xl px-4 gap-2 border-slate-200"><Filter className="w-4 h-4" /> All Statuses</Button>
             <Button variant="outline" size="sm" className="h-10 rounded-xl px-4 gap-2 border-slate-200"><Filter className="w-4 h-4" /> All Vendors</Button>
           </div>
        </div>
        <div className="overflow-x-auto w-full">
          <div className="hidden md:block min-w-full">
          <Table compact>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100">
                <TableHead className="py-4 pl-8 font-bold text-slate-900">PO ID</TableHead>
                <TableHead className="font-bold text-slate-900">PROJECT</TableHead>
                <TableHead className="font-bold text-slate-900">VENDOR</TableHead>
                <TableHead className="font-bold text-slate-900">ITEMS</TableHead>
                <TableHead className="text-right font-bold text-slate-900">TOTAL</TableHead>
                <TableHead className="font-bold text-slate-900">STATUS</TableHead>
                <TableHead className="text-right pr-8 font-bold text-slate-900">DATE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEnrichedPos.map((po) => (
                <TableRow 
                  key={po.id} 
                  className="border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedPo(po);
                    setIsDetailOpen(true);
                  }}
                >
                  <TableCell className="py-4 pl-8">
                    <span className="font-mono text-xs font-bold text-blue-600 group-hover:underline block">{po.poNumber || `#${po.id.slice(-6)}`}</span>
                    {po.linkedMrNumber && <span className="font-mono text-[9px] text-orange-600 mt-1 block tracking-wider">MR: {po.linkedMrNumber}</span>}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">{getProjectDisplayName(po.projectId, po.project)}</TableCell>
                  <TableCell className="text-slate-600">{po.vendor?.name || 'Loading...'}</TableCell>
                  <TableCell className="text-slate-600">{po.items.length} materials</TableCell>
                  <TableCell className="text-right font-mono text-slate-900 font-bold">₹{po.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">{po.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-8 text-xs text-slate-500 font-medium">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedEnrichedPos.length === 0 && (
                <TableRow>
                   <TableCell colSpan={7} className="h-48 text-center text-slate-400 italic">
                      No active purchase orders. Use "Create PO" to initiate procurement.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
            {paginatedEnrichedPos.length === 0 ? (
               <div className="p-8 text-center text-slate-500 italic">No purchase orders found.</div>
            ) : paginatedEnrichedPos.map((po) => (
               <div 
                  key={po.id} 
                  className="p-4 flex flex-col gap-3 cursor-pointer group hover:bg-slate-50/50 transition-colors"
                  onClick={() => {
                    setSelectedPo(po);
                    setIsDetailOpen(true);
                  }}
               >
                  <div className="flex justify-between items-start">
                     <div className="flex flex-col">
                        <span className="font-mono text-sm font-bold text-blue-600 group-hover:underline block">{po.poNumber || `#${po.id.slice(-6)}`}</span>
                        {po.linkedMrNumber && <span className="font-mono text-[10px] text-orange-600 mt-0.5 block tracking-wider">MR: {po.linkedMrNumber}</span>}
                     </div>
                     <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">{po.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                     <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Project</span>
                        <span className="text-xs font-bold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit">{getProjectDisplayName(po.projectId, po.project)}</span>
                     </div>
                     <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Total Amount</span>
                        <span className="text-sm font-mono text-slate-900 font-black leading-none">₹{po.totalAmount.toLocaleString()}</span>
                     </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs mt-1 border-t border-slate-100 pt-2">
                     <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {po.vendor?.name || 'Loading...'}
                     </div>
                     <div className="flex flex-col items-end">
                       <span className="text-slate-500 font-medium">{po.items.length} materials</span>
                       <span className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(po.createdAt).toLocaleDateString()}</span>
                     </div>
                  </div>
               </div>
            ))}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-4 font-bold border-slate-200 bg-white hover:bg-slate-50"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
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
              </div>

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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="font-serif italic text-2xl">Purchase Order Detail</span>
              <Badge variant="outline" className="uppercase font-mono">{selectedPo?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPo && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400">Vendor Detail</p>
                  <p className="font-bold text-slate-900">{vendors.find(v => v.id === selectedPo.vendorId)?.name}</p>
                  <p className="text-slate-500">{vendors.find(v => v.id === selectedPo.vendorId)?.phone}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-mono text-slate-400">Order Information</p>
                  <p className="font-bold text-slate-900">{selectedPo.poNumber || `PO #${selectedPo.id.slice(-6)}`}</p>
                  {selectedPo.linkedMrNumber && <p className="text-[10px] text-orange-600 font-mono tracking-wider">Ref: {selectedPo.linkedMrNumber}</p>}
                  <p className="text-slate-500">{new Date(selectedPo.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-sm overflow-x-auto">
                <Table compact>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-[10px] uppercase font-mono italic">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPo.items.map((item, idx) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <TableRow key={idx} className="text-xs">
                          <TableCell className="font-medium">{product?.name || 'Unknown Product'}</TableCell>
                          <TableCell className="text-right">{item.quantityOrdered} {product?.uom}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                             ₹{item.unitPrice.toLocaleString()}
                             <PriceComparisonBadge materialId={item.productId} currentPrice={item.unitPrice} />
                          </TableCell>
                          <TableCell className="text-right font-bold">₹{(item.quantityOrdered * item.unitPrice).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                 <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-500">
                       <span>Tax ({selectedPo.taxPercent}%):</span>
                       <span>₹{(selectedPo.totalAmount - (selectedPo.totalAmount / (1 + selectedPo.taxPercent/100))).toLocaleString()}</span>
                    </div>
                    {selectedPo.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 font-medium">
                         <span>Discount:</span>
                         <span>-₹{selectedPo.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2 text-slate-900">
                       <span>Total Payable:</span>
                       <span className="font-mono">₹{selectedPo.totalAmount.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] uppercase font-mono text-slate-400 mb-3">Workflow Actions</p>
                
                {selectedPo.status === 'PRICE_VERIFICATION_REQUIRED' && selectedPo.priceVerification && (
                  <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-red-800 font-bold">
                       <AlertCircle className="w-5 h-5" />
                       Price Verification Required
                    </div>
                    <p className="text-sm text-red-700">This Purchase Order contains items priced &gt;15% higher than their last purchase price.</p>
                    <div className="space-y-2">
                       {selectedPo.priceVerification.flaggedItems?.map((fi, i) => (
                         <div key={i} className="text-xs bg-white p-2 rounded border border-red-100 flex justify-between items-center">
                           <div>
                             <span className="font-bold">{fi.productName}</span><br />
                             <span className="text-slate-500">Prev: ₹{fi.previousPrice.toLocaleString()} | Curr: ₹{fi.currentPrice.toLocaleString()}</span>
                           </div>
                           <div className="text-red-600 font-bold">
                             +₹{(fi.currentPrice - fi.previousPrice).toLocaleString()} ({fi.percentageIncrease.toFixed(1)}%)
                           </div>
                         </div>
                       ))}
                    </div>
                    
                    {['ADMIN', 'MANAGER'].includes(profile?.role || '') ? (
                      <div className="space-y-2 pt-2 border-t border-red-200">
                        <Label className="text-xs font-bold text-red-800">Reason for Approval (Required)</Label>
                        <Textarea 
                          placeholder="Provide justification for approving this high-priced purchase..."
                          className="bg-white border-red-200 text-sm"
                          id="verificationReason"
                        />
                        <div className="flex gap-2 pt-2">
                          <Button 
                             className="flex-1 bg-red-600 hover:bg-red-700"
                             onClick={() => {
                               const reason = (document.getElementById('verificationReason') as HTMLTextAreaElement).value;
                               if (!reason.trim()) {
                                 toast.error('Reason is mandatory for approval');
                                 return;
                               }
                               // Update PO
                               const verificationUpdates = {
                                 priceVerification: {
                                   ...selectedPo.priceVerification,
                                   reason: reason,
                                   approvedBy: profile?.id,
                                   approvalTime: new Date().toISOString()
                                 }
                               };
                               POService.updateStatus(selectedPo, 'APPROVED', verificationUpdates).then(() => {
                                  toast.success('Price verified and PO approved');
                                  
                                  // Add audit log
                                  addDoc(collection(db, 'auditLogs'), {
                                      action: 'PRICE_VERIFICATION_APPROVED',
                                      poId: selectedPo.id,
                                      poNumber: selectedPo.poNumber,
                                      userId: profile?.id,
                                      userEmail: profile?.email,
                                      userName: profile?.name,
                                      reason: reason,
                                      timestamp: serverTimestamp(),
                                      flaggedItems: selectedPo.priceVerification?.flaggedItems,
                                      highestPercentageIncrease: selectedPo.priceVerification?.highestPercentageIncrease
                                  });
                                  
                                  setIsDetailOpen(false);
                               });
                             }}
                          >
                             Verify & Approve Order
                          </Button>
                          <Button 
                             className="flex-1 bg-white text-red-600 hover:bg-red-100 border border-red-200"
                             onClick={() => handleUpdateStatus('REJECTED')}
                          >
                             Reject Order
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-red-600 italic bg-red-100 p-2 rounded">
                        Only Managers or Admins can approve this order.
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedPo.status === 'DRAFT' && (
                    <>
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateStatus('APPROVED')}
                      >
                        Approve Order
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 text-red-600 hover:bg-red-50 border-red-100"
                        onClick={() => handleUpdateStatus('REJECTED')}
                      >
                        Reject Order
                      </Button>
                    </>
                  )}
                  {selectedPo.status === 'APPROVED' && (
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleUpdateStatus('SHIPPED')}
                    >
                      Mark as Shipped
                    </Button>
                  )}
                  {(selectedPo.status === 'RECEIVED' || selectedPo.status === 'PARTIAL_RECEIVED') && (
                    <Button 
                      className="flex-1 bg-slate-900 hover:bg-slate-800"
                      onClick={() => handleUpdateStatus('CLOSED')}
                    >
                      Close Order
                    </Button>
                  )}
                  <Button variant="ghost" className="flex-1" onClick={() => setIsDetailOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
