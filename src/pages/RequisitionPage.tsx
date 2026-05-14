import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PRService, ProjectService, ProductService, VendorService } from '@/services/store';
import { PurchaseRequisition, Project, Product, Vendor } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { WorkflowProgress } from '@/components/WorkflowProgress';
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
import { Plus, FileText, CheckCircle2, XCircle, Clock, Trash2, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MaterialSelector } from '@/components/MaterialSelector';
import { VendorSelector } from '@/components/VendorSelector';

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default function RequisitionPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [items, setItems] = useState<{ productId: string; quantity: number; estimatedPrice: number }[]>([]);

  useEffect(() => {
    const unsubPR = PRService.subscribe(setRequisitions);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubVendors = VendorService.subscribe(setVendors);
    return () => { unsubPR(); unsubProjects(); unsubProducts(); unsubVendors(); };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (projectIdParam) {
      if (isMounted) setProjectId(projectIdParam);
    }
    return () => { isMounted = false; };
  }, [projectIdParam]);

  const filteredRequisitions = projectIdParam 
    ? requisitions.filter(r => r.projectId === projectIdParam)
    : requisitions;

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 0, estimatedPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!projectId || items.length === 0) {
      toast.error('Please select a project and add at least one item');
      return;
    }

    try {
      await PRService.add({
        projectId,
        requesterId: user.uid,
        vendorId: vendorId || undefined,
        status: 'PENDING',
        items: items.map(i => ({ ...i, quantityReceived: 0 })),
        totalEstimatedAmount: items.reduce((acc, curr) => acc + (curr.quantity * curr.estimatedPrice), 0),
        urgency,
        createdAt: new Date().toISOString()
      });
      toast.success('Requisition submitted for approval');
      setIsAddOpen(false);
      setItems([]);
      setProjectId('');
      setVendorId('');
    } catch (err) {
      console.error(err);
      toast.error('Submission failed');
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!user) return;
    try {
      await PRService.updateStatus(id, status, user.uid);
      toast.success(`Requisition ${status.toLowerCase()}`);
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
      case 'REJECTED': return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default: return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep="PR" />
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Purchase Requisitions</h1>
          <p className="text-slate-500 text-sm">Raise material requests for project sites.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-orange-600 hover:bg-orange-700 h-10 gap-2">
              <Plus className="w-4 h-4" /> Raise PR
            </Button>
          } />
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Requisition</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Assign to Project</Label>
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
                    <Label>Preferred Vendor (Optional)</Label>
                    <VendorSelector 
                      vendors={vendors}
                      selectedVendorId={vendorId}
                      onSelect={setVendorId}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Urgency Level</Label>
                    <Select value={urgency} onValueChange={(v: any) => setUrgency(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-slate-50 p-2 rounded-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest italic">Material List</h3>
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
                              value={isNaN(item.quantity) ? 0 : item.quantity} 
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                           />
                        </div>
                        <div className="w-32 space-y-2">
                           <Label className="text-[10px] uppercase font-mono">Est. Price</Label>
                           <Input 
                              type="number" 
                              className="h-9" 
                              value={isNaN(item.estimatedPrice) ? 0 : item.estimatedPrice} 
                              onChange={(e) => updateItem(idx, 'estimatedPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                           />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-red-600" onClick={() => removeItem(idx)}>
                           <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                 ))}
                 {items.length === 0 && <div className="text-center py-8 text-slate-400 italic">Add materials to request.</div>}
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-slate-200">
                <div className="text-right">
                   <p className="text-[10px] uppercase font-mono text-slate-400">Total Est. Budget</p>
                   <p className="text-lg font-bold text-slate-900">₹{items.reduce((acc, curr) => acc + (curr.quantity * curr.estimatedPrice), 0).toLocaleString()}</p>
                </div>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 px-8">Submit PR</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px] font-mono uppercase tracking-widest italic bg-slate-50">
              <TableHead>PR #</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Preferred Vendor</TableHead>
              <TableHead>Materials</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Est. Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-sm">
            {filteredRequisitions.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell className="font-mono text-xs text-slate-400 uppercase">{pr.id?.slice(-8) || 'N/A'}</TableCell>
                <TableCell className="font-bold text-slate-900">
                   {projects.find(p => p.id === pr.projectId)?.name || 'Unknown Project'}
                </TableCell>
                <TableCell>
                   {pr.vendorId ? (
                     <div className="flex items-center gap-1.5 text-slate-600">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vendors.find(v => v.id === pr.vendorId)?.name || 'Loading...'}</span>
                     </div>
                   ) : (
                     <span className="text-slate-400 italic text-[10px]">Not specified</span>
                   )}
                </TableCell>
                <TableCell>
                   <span className="text-slate-600">{pr.items.length} items</span>
                </TableCell>
                <TableCell>
                   <Badge variant="outline" className={`text-[10px] uppercase h-5 font-mono ${
                     pr.urgency === 'HIGH' ? 'border-red-200 text-red-600' : 
                     pr.urgency === 'MEDIUM' ? 'border-orange-200 text-orange-600' : 
                     'border-slate-200 text-slate-600'
                   }`}>
                     {pr.urgency}
                   </Badge>
                </TableCell>
                <TableCell className="font-bold">₹{pr.totalEstimatedAmount?.toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge(pr.status)}</TableCell>
                <TableCell className="text-right">
                  {pr.status === 'PENDING' ? (
                    <div className="flex gap-2 justify-end">
                       <Button size="sm" variant="outline" className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50" onClick={() => handleAction(pr.id!, 'APPROVED')}>Approve</Button>
                       <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleAction(pr.id!, 'REJECTED')}>Reject</Button>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase font-mono text-slate-400">Finalized</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {requisitions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-400 italic">No requisitions found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
