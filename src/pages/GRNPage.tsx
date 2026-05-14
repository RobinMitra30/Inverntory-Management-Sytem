import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GRNService, POService, InventoryService, ProductService, ProjectService, VendorService } from '@/services/store';
import { GRN, PurchaseOrder, UserRole, Product, Project, Vendor } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2, XCircle, FileText, Filter, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function GRNPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProjectSelectOpen, setIsProjectSelectOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [selectedGrn, setSelectedGrn] = useState<GRN | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [grnNumber, setGrnNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const unsubGrn = GRNService.subscribe(setGrns);
    const unsubPo = POService.subscribe(setPos);
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubVendors = VendorService.subscribe(setVendors);
    
    return () => { 
      unsubGrn(); 
      unsubPo(); 
      unsubProducts();
      unsubProjects();
      unsubVendors();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        const projectGrns = grns.filter(g => g.projectId === selectedProjectId);
        const seq = (projectGrns.length + 1).toString().padStart(4, '0');
        const prefix = project.name.substring(0, 4).toUpperCase();
        if (isMounted) setGrnNumber(`${prefix}-GRN-${seq}`);
      }
    }
    return () => { isMounted = false; };
  }, [selectedProjectId, projects, grns]);

  const filteredGrns = projectIdParam 
    ? grns.filter(g => g.projectId === projectIdParam)
    : grns;

  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId);
    const po = pos.find(p => p.id === poId);
    if (po) {
      setItems(po.items.map(item => ({
        productId: item.productId,
        orderedQuantity: item.quantityOrdered,
        receivedQuantity: Math.max(0, item.quantityOrdered - (item.quantityReceived || 0)),
        rejectedQuantity: 0,
        qcStatus: 'PASSED'
      })));
    }
  };

  const handleCreate = async () => {
    if (!selectedPoId) return toast.error('Select a PO first');
    const po = pos.find(p => p.id === selectedPoId)!;

    try {
      await GRNService.create({
        grnNumber,
        poId: selectedPoId,
        projectId: po.projectId,
        vendorId: po.vendorId,
        challanNumber,
        items,
        qcStatus: 'PENDING',
        status: 'PENDING_APPROVAL',
        receivedBy: profile?.uid || 'unknown',
        siteLocation,
        createdAt: new Date().toISOString()
      });
      setIsAddOpen(false);
      toast.success('GRN submitted for approval');
    } catch (err) {
      toast.error('Failed to create GRN');
    }
  };

  const handleCreateClick = () => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
      setIsAddOpen(true);
    } else {
      setIsProjectSelectOpen(true);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (projectIdParam) {
      if (isMounted) setSelectedProjectId(projectIdParam);
    }
    return () => { isMounted = false; };
  }, [projectIdParam]);


  const handleApprove = async (grnId: string) => {
    if (profile?.role !== UserRole.PROJECT_MANAGER && profile?.role !== UserRole.ADMIN) {
      return toast.error('Unauthorized');
    }
    try {
      await InventoryService.approveGRN(grnId, profile.uid);
      toast.success('GRN Approved & Stock Updated');
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 uppercase text-[10px] font-mono">Approved</Badge>;
      case 'PENDING_APPROVAL': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 uppercase text-[10px] font-mono">Pending</Badge>;
      case 'REJECTED': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 uppercase text-[10px] font-mono">Rejected</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px] font-mono text-slate-400">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep="GRN" />
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Goods Receipt Notes</h1>
          <p className="text-slate-500 text-sm">PR → PO → <span className="text-orange-600 font-bold underline">GRN</span> → Stock Update</p>
        </div>

        <Button onClick={handleCreateClick} className="bg-orange-600 hover:bg-orange-700 h-10 gap-2">
          <Plus className="w-4 h-4" /> Create GRN
        </Button>

        {/* Project Selection Modal */}
        <Dialog open={isProjectSelectOpen} onOpenChange={setIsProjectSelectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Project for GRN Generation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select onValueChange={(val) => {
                  setSelectedProjectId(val);
                  setIsProjectSelectOpen(false);
                  setIsAddOpen(true);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center pr-8">
                <span>New Goods Receipt Note</span>
                <span className="text-sm font-mono text-slate-400 uppercase tracking-widest">{grnNumber}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GRN ID*</Label>
                  <Input value={grnNumber} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Received from*</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Received on*</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                  <Label>Received By</Label>
                  <Input defaultValue={profile?.name || profile?.uid || 'Unknown'} readOnly />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Tags</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Type & Select" /></SelectTrigger>
                </Select>
              </div>

              <div className="border rounded-md p-4 space-y-4">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
                   <Label className="font-bold">Material Details</Label>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2"><input type="radio" name="mat" value="select" defaultChecked/> Select Material</label>
                      <label className="flex items-center gap-2"><input type="radio" name="mat" value="upload"/> Upload Image</label>
                   </div>
                 </div>
                 <Button variant="outline" onClick={() => {
                   toast.info("Material selection dialog would open here.");
                 }}><Plus className="w-4 h-4 mr-2"/> Add Materials</Button>
              </div>

              <div className="border rounded-md p-4 space-y-4">
                <Label className="font-bold">Invoice Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Enter invoice number" />
                  <Input placeholder="Enter delivery challan number" />
                  <Input type="date" />
                </div>
                <Button variant="outline"><Plus className="w-4 h-4 mr-2"/> Add invoice amount details</Button>
              </div>

              <div className="space-y-2">
                <Label>Remarks & Attachments</Label>
                <Input placeholder="Enter remarks" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">Create GRN</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm h-[600px] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
           <Filter className="w-4 h-4 text-slate-400" />
           <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Filters applied: All Transactions</span>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
              <TableRow className="text-[10px] font-mono uppercase tracking-widest italic">
                <TableHead className="w-[150px]">GRN Number</TableHead>
                <TableHead>PO Ref</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrns.map((grn) => {
                const po = pos.find(p => p.id === grn.poId);
                return (
                  <TableRow 
                    key={grn.id} 
                    className="group transition-colors hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => {
                      setSelectedGrn(grn);
                      setIsDetailOpen(true);
                    }}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-slate-900 group-hover:text-blue-600 group-hover:underline">{grn.grnNumber}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {po?.poNumber || `#${grn.poId.slice(-6)}`}
                    </TableCell>
                  <TableCell className="text-xs text-slate-600">{new Date(grn.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{grn.siteLocation}</TableCell>
                  <TableCell>{getStatusBadge(grn.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {grn.status === 'PENDING_APPROVAL' && (profile?.role === UserRole.PROJECT_MANAGER || profile?.role === UserRole.ADMIN) && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleApprove(grn.id)}
                            className="h-8 border-green-200 text-green-700 hover:bg-green-50 gap-1 px-3"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={async () => {
                              try {
                                await GRNService.updateStatus(grn.id, 'REJECTED');
                                toast.success('GRN Rejected');
                              } catch (err) {
                                toast.error('Rejection failed');
                              }
                            }}
                            className="h-8 border-red-200 text-red-700 hover:bg-red-50 gap-1 px-3"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                         <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
              {grns.length === 0 && (
                <TableRow>
                   <TableCell colSpan={6} className="h-64 text-center">
                     <div className="flex flex-col items-center gap-2 opacity-30">
                       <ClipboardList className="w-12 h-12" />
                       <p className="italic font-serif">No GRN records found.</p>
                     </div>
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
            <DialogTitle className="flex justify-between items-center pr-8">
              <span>GRN Details</span>
              <span className="text-sm font-mono text-slate-400">{selectedGrn?.grnNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedGrn && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                    <Label className="text-[10px] uppercase font-mono text-slate-400">PO Reference</Label>
                    <p className="font-bold">{pos.find(p => p.id === selectedGrn.poId)?.poNumber || `#${selectedGrn.poId.slice(-6)}`}</p>
                 </div>
                 <div>
                    <Label className="text-[10px] uppercase font-mono text-slate-400">Vendor</Label>
                    <p className="font-bold">{vendors.find(v => v.id === selectedGrn.vendorId)?.name || 'Unknown Vendor'}</p>
                 </div>
                 <div>
                    <Label className="text-[10px] uppercase font-mono text-slate-400">Challan Number</Label>
                    <p>{selectedGrn.challanNumber || 'N/A'}</p>
                 </div>
                 <div>
                    <Label className="text-[10px] uppercase font-mono text-slate-400">Received Date</Label>
                    <p>{new Date(selectedGrn.createdAt).toLocaleDateString()}</p>
                 </div>
              </div>

              <div className="border border-slate-100 rounded-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="text-[10px] font-mono uppercase italic">
                      <TableHead>Material / Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right text-red-600">Rejected</TableHead>
                      <TableHead className="text-center">QC Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {selectedGrn.items.map((item, idx) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                             <p className="font-bold">{product?.name || 'Unknown Product'}</p>
                             <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{product?.sku || item.productId}</p>
                          </TableCell>
                          <TableCell className="text-right">{item.orderedQuantity} {product?.uom}</TableCell>
                          <TableCell className="text-right font-bold">{item.receivedQuantity} {product?.uom}</TableCell>
                          <TableCell className="text-right text-red-600">{item.rejectedQuantity} {product?.uom}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.qcStatus === 'PASSED' ? 'default' : 'destructive'} className="text-[9px] h-4">
                              {item.qcStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
