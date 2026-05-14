import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { POService, ProjectService, VendorService, ProductService } from '@/services/store';
import { PurchaseOrder, Project, Vendor, Product, POLineItem } from '@/types';
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
import { ShoppingCart, FilePlus, Filter, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialSelector } from '@/components/MaterialSelector';
import { VendorSelector } from '@/components/VendorSelector';

export default function OrdersPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

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

  const filteredPos = projectIdParam 
    ? pos.filter(po => po.projectId === projectIdParam)
    : pos;

  const enrichedPos = filteredPos.map(po => ({
    ...po,
    project: projects.find(p => p.id === po.projectId),
    vendor: vendors.find(v => v.id === po.vendorId)
  }));

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

      await POService.add({
        poNumber,
        projectId,
        vendorId,
        status: 'PENDING',
        items: items.map(i => ({ ...i, quantityReceived: 0 })),
        taxPercent,
        discountAmount,
        totalAmount: calculateTotal(),
        createdAt: new Date().toISOString()
      });
      toast.success(`Purchase Order ${poNumber} created successfully`);
      setIsAddOpen(false);
      setItems([]);
      setProjectId(projectIdParam || '');
      setVendorId('');
    } catch (err) {
      toast.error('Failed to create PO');
    }
  };

  const handleUpdateStatus = async (status: PurchaseOrder['status']) => {
    if (!selectedPo?.id) return;
    try {
      await POService.updateStatus(selectedPo.id, status);
      toast.success(`PO status updated to ${status}`);
      setIsDetailOpen(false);
    } catch (err) {
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                    <div key={idx} className="flex gap-3 items-end border-b border-slate-100 pb-4">
                        <div className="flex-1 space-y-2">
                           <Label className="text-[10px] uppercase font-mono">Product</Label>
                           <MaterialSelector 
                              products={products}
                              selectedProductId={item.productId}
                              onSelect={(v) => updateItem(idx, 'productId', v)}
                           />
                        </div>
                        <div className="w-24 space-y-2">
                           <Label className="text-[10px] uppercase font-mono">Qty</Label>
                           <Input 
                              type="number" 
                              className="h-9" 
                              value={isNaN(item.quantityOrdered) ? '' : item.quantityOrdered} 
                              onChange={(e) => updateItem(idx, 'quantityOrdered', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                           />
                        </div>
                        <div className="w-32 space-y-2">
                           <Label className="text-[10px] uppercase font-mono">Unit Price</Label>
                           <Input 
                              type="number" 
                              className="h-9" 
                              value={isNaN(item.unitPrice) ? '' : item.unitPrice} 
                              onChange={(e) => updateItem(idx, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                           />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-red-600" onClick={() => removeItem(idx)}>
                           <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                 ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-4">
                  <div className="space-y-2 text-right border rounded p-4 bg-slate-50/30">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 uppercase font-mono text-[10px]">Subtotal:</span>
                      <span className="font-bold">₹{calculateSubtotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
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

      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex gap-4">
             <Button variant="outline" size="sm" className="h-8 gap-2"><Filter className="w-3 h-3" /> All Statuses</Button>
             <Button variant="outline" size="sm" className="h-8 gap-2"><Filter className="w-3 h-3" /> All Vendors</Button>
           </div>
           <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
             Scroll horizontally for line items
           </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] font-mono uppercase tracking-widest italic bg-white">
                <TableHead>PO ID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total (Inc Tax)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-sm">
              {enrichedPos.map((po) => (
                <TableRow 
                  key={po.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => {
                    setSelectedPo(po);
                    setIsDetailOpen(true);
                  }}
                >
                  <TableCell className="font-mono text-xs font-bold text-blue-600 group-hover:underline">{po.poNumber || `#${po.id.slice(-6)}`}</TableCell>
                  <TableCell className="font-medium">{po.project?.name || 'Loading...'}</TableCell>
                  <TableCell>{po.vendor?.name || 'Loading...'}</TableCell>
                  <TableCell>{po.items.length} materials</TableCell>
                  <TableCell className="text-right font-mono font-bold">₹{po.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[9px] font-mono tracking-tight">{po.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-400 italic">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {enrichedPos.length === 0 && (
                <TableRow>
                   <TableCell colSpan={7} className="h-48 text-center text-slate-400 italic font-serif">
                      No active purchase orders. Use "Create PO" to initiate procurement.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
                  <p className="text-slate-500">{new Date(selectedPo.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-sm">
                <Table>
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
                          <TableCell className="text-right">₹{item.unitPrice.toLocaleString()}</TableCell>
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
                <div className="flex gap-2">
                  {selectedPo.status === 'PENDING' && (
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
                      onClick={() => handleUpdateStatus('READY_FOR_PICKUP')}
                    >
                      Mark as Ready for Pickup
                    </Button>
                  )}
                  {selectedPo.status === 'READY_FOR_PICKUP' && (
                    <Button 
                      className="flex-1 bg-slate-900 hover:bg-slate-800"
                      onClick={() => handleUpdateStatus('SHIPPED')}
                    >
                      Confirm Shipped
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
