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
import { Plus, CheckCircle2, XCircle, FileText, Filter, ClipboardList, Trash2, Box } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialSelector } from '@/components/MaterialSelector';

export default function GRNPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isProjectSelectOpen, setIsProjectSelectOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [selectedGrn, setSelectedGrn] = useState<GRN | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [grnNumber, setGrnNumber] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState<string>('');
  const [receiptType, setReceiptType] = useState<any>('DIRECT_SITE_DELIVERY');

  const getVendorName = (idOrName: string) => {
    const vendor = vendors.find(v => v.id === idOrName || v.name === idOrName);
    return vendor ? vendor.name : idOrName || 'Unknown Vendor';
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'receivedQuantity' || field === 'rejectedQuantity') {
      newItems[index] = { ...newItems[index], [field]: Number(value) || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addManualItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (items.find(i => i.productId === productId)) {
      return toast.error('Item already in list');
    }

    setItems([...items, {
      productId: product.id,
      orderedQuantity: 0,
      receivedQuantity: 1,
      rejectedQuantity: 0,
      qcStatus: 'PASSED'
    }]);
  };

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

  useEffect(() => {
    setCurrentPage(1);
  }, [projectIdParam]);

  const totalPages = Math.ceil(filteredGrns.length / itemsPerPage);
  const paginatedGrns = filteredGrns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const handlePoSelect = (poId: string) => {
    if (poId === 'none') {
      setSelectedPoId('');
      return;
    }
    
    setSelectedPoId(poId);
    const po = pos.find(p => p.id === poId);
    if (po) {
      setVendorId(po.vendorId);
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
    if (!vendorId) return toast.error('Select a vendor');
    if (!selectedProjectId) return toast.error('Project context missing');
    if (items.length === 0) return toast.error('Add items to GRN');

    try {
      await GRNService.create({
        grnNumber,
        poId: selectedPoId || 'MANUAL',
        projectId: selectedProjectId,
        vendorId: vendorId,
        challanNumber,
        receiptType,
        items,
        qcStatus: 'PENDING',
        status: 'PENDING_APPROVAL',
        receivedBy: profile?.uid || 'unknown',
        siteLocation,
        createdAt: new Date().toISOString()
      });
      setIsAddOpen(false);
      setItems([]);
      setVendorId('');
      setSelectedPoId('');
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
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                <Label className="text-orange-900 font-bold flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Receipt Type (ERP Transaction Flow)
                </Label>
                <Select value={receiptType} onValueChange={setReceiptType}>
                  <SelectTrigger className="bg-white border-orange-200 text-orange-900">
                    <SelectValue placeholder="Select Receipt Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENDOR_TO_WAREHOUSE">1. Vendor Delivery To Warehouse (WH Stock Up)</SelectItem>
                    <SelectItem value="WAREHOUSE_TRANSFER">2. Warehouse Transfer (WH Stock Out → Site Stock In)</SelectItem>
                    <SelectItem value="DIRECT_SITE_DELIVERY">3. Direct Site Delivery (Virtual WH Flow - SSOT)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-orange-700 italic">
                  {receiptType === 'DIRECT_SITE_DELIVERY' && "SSOT Rule: Vendor → Virtual WH Receipt → WH Issue → Site Inventory"}
                  {receiptType === 'VENDOR_TO_WAREHOUSE' && "Standard: Vendor → Warehouse Inventory (For later project issue)"}
                  {receiptType === 'WAREHOUSE_TRANSFER' && "Inter-Project: Warehouse → Site Inventory"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GRN ID*</Label>
                  <Input value={grnNumber} readOnly />
                </div>
                {receiptType !== 'WAREHOUSE_TRANSFER' ? (
                  <div className="space-y-2">
                    <Label>Received from Vendor*</Label>
                    <Select value={vendorId} onValueChange={setVendorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor">
                           {getVendorName(vendorId)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Source Store / Warehouse*</Label>
                    <Select value="MAIN_WAREHOUSE" disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Main Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAIN_WAREHOUSE">Main Warehouse (WH001)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {receiptType !== 'WAREHOUSE_TRANSFER' && (
                  <div className="space-y-2">
                    <Label>Purchase Order Ref (Optional)</Label>
                    <Select value={selectedPoId} onValueChange={handlePoSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select PO" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No PO Reference</SelectItem>
                        {pos.filter(p => !selectedProjectId || p.projectId === selectedProjectId).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.poNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Delivery Date*</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Received By
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] uppercase font-bold">
                      Control Active
                    </Badge>
                  </Label>
                  <Input defaultValue={profile?.name || profile?.uid || 'Unknown'} readOnly />
                </div>
                {receiptType === 'WAREHOUSE_TRANSFER' && (
                   <div className="space-y-2">
                    <Label>Transfer Reference</Label>
                    <Input placeholder="Enter Transfer Note / MR No." />
                  </div>
                )}
              </div>
              
              {receiptType === 'DIRECT_SITE_DELIVERY' && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Box className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 leading-none">Virtual Warehouse Receipt Required</p>
                    <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                      SSOT Rule Active: This material will be virtually registered in <strong>Main Warehouse</strong> before being issued to site inventory.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Type & Select" /></SelectTrigger>
                </Select>
              </div>

              <div className="border rounded-sm p-4 space-y-4 bg-slate-50/30">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
                   <Label className="font-bold">Material Details</Label>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs"><input type="radio" name="mat" value="select" defaultChecked/> Select Material</label>
                      <label className="flex items-center gap-2 text-xs"><input type="radio" name="mat" value="upload"/> Upload Image</label>
                   </div>
                 </div>

                 {items.length > 0 && (
                   <div className="border border-slate-200 rounded-sm bg-white overflow-hidden overflow-x-auto">
                     <div className="hidden md:block">
                     <Table compact>
                        <TableHeader className="bg-slate-50">
                          <TableRow className="text-[10px] font-mono uppercase">
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Ordered</TableHead>
                            <TableHead className="w-24 text-right">Received</TableHead>
                            <TableHead className="w-24 text-right">Rejected</TableHead>
                            <TableHead className="w-24 text-center">QC Status</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, idx) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                              <TableRow key={idx}>
                                <TableCell className="py-2">
                                  <div className="text-xs font-medium">{product?.name || 'Loading...'}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{product?.uom}</div>
                                </TableCell>
                                <TableCell className="text-right text-xs">{item.orderedQuantity}</TableCell>
                                <TableCell className="py-2">
                                  <Input 
                                    type="number" 
                                    className="h-7 text-right text-xs" 
                                    value={item.receivedQuantity}
                                    onChange={(e) => updateItem(idx, 'receivedQuantity', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Input 
                                    type="number" 
                                    className="h-7 text-right text-xs text-red-600" 
                                    value={item.rejectedQuantity}
                                    onChange={(e) => updateItem(idx, 'rejectedQuantity', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Select 
                                    value={item.qcStatus} 
                                    onValueChange={(val) => updateItem(idx, 'qcStatus', val)}
                                  >
                                    <SelectTrigger className="h-7 text-[10px] px-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PASSED">Passed</SelectItem>
                                      <SelectItem value="FAILED">Failed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                    onClick={() => removeItem(idx)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                     </Table>
                     </div>
                     <div className="md:hidden flex flex-col divide-y divide-slate-100">
                        {items.map((item, idx) => {
                          const product = products.find(p => p.id === item.productId);
                          return (
                            <div key={idx} className="p-4 flex flex-col gap-3">
                               <div className="flex justify-between items-start">
                                 <div>
                                    <p className="text-xs font-bold">{product?.name || 'Loading...'}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{product?.uom}</p>
                                 </div>
                                 <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-slate-400 hover:text-red-500 shrink-0"
                                    onClick={() => removeItem(idx)}
                                 >
                                    <Trash2 className="w-3.5 h-3.5" />
                                 </Button>
                               </div>
                               <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                     <Label className="text-[10px] text-slate-500">Ordered</Label>
                                     <div className="h-8 flex items-center px-3 bg-slate-50 rounded-md text-xs font-mono">{item.orderedQuantity}</div>
                                  </div>
                                  <div className="space-y-1">
                                     <Label className="text-[10px] text-slate-500">Received</Label>
                                     <Input 
                                        type="number" 
                                        className="h-8 text-xs" 
                                        value={item.receivedQuantity}
                                        onChange={(e) => updateItem(idx, 'receivedQuantity', e.target.value)}
                                     />
                                  </div>
                                  <div className="space-y-1">
                                     <Label className="text-[10px] text-red-500">Rejected</Label>
                                     <Input 
                                        type="number" 
                                        className="h-8 text-xs text-red-600 focus-visible:ring-red-500" 
                                        value={item.rejectedQuantity}
                                        onChange={(e) => updateItem(idx, 'rejectedQuantity', e.target.value)}
                                     />
                                  </div>
                                  <div className="space-y-1">
                                     <Label className="text-[10px] text-slate-500">QC Status</Label>
                                     <Select 
                                        value={item.qcStatus} 
                                        onValueChange={(val) => updateItem(idx, 'qcStatus', val)}
                                     >
                                        <SelectTrigger className="h-8 text-[10px] px-2">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="PASSED">Passed</SelectItem>
                                          <SelectItem value="FAILED">Failed</SelectItem>
                                        </SelectContent>
                                     </Select>
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                   </div>
                 )}

                 <div className="w-full">
                   <MaterialSelector 
                      products={products}
                      selectedProductId=""
                      onSelect={addManualItem}
                      className="h-10 border-dashed"
                   />
                 </div>
              </div>

              <div className="border rounded-md p-4 space-y-4">
                <Label className="font-bold">Invoice Details</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="bg-white border-none rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <div className="hidden md:block min-w-[800px]">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 uppercase text-[10px] tracking-widest italic">
                <TableHead className="py-4 pl-8 font-bold text-slate-900">GRN Number</TableHead>
                <TableHead className="font-bold text-slate-900">Type</TableHead>
                <TableHead className="font-bold text-slate-900">PO Ref</TableHead>
                <TableHead className="font-bold text-slate-900">Date</TableHead>
                <TableHead className="font-bold text-slate-900">Site</TableHead>
                <TableHead className="font-bold text-slate-900">Status</TableHead>
                <TableHead className="text-right pr-8 font-bold text-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGrns.map((grn) => {
                const po = pos.find(p => p.id === grn.poId);
                return (
                  <TableRow 
                    key={grn.id} 
                    className="group border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedGrn(grn);
                      setIsDetailOpen(true);
                    }}
                  >
                    <TableCell className="py-4 pl-8 font-mono text-xs font-semibold text-slate-900 group-hover:text-blue-600 group-hover:underline">{grn.grnNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold border-slate-200 text-slate-500">
                        {grn.receiptType?.replace(/_/g, ' ') || 'STANDARD'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {po?.poNumber || `#${grn.poId.slice(-6)}`}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{new Date(grn.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{grn.siteLocation}</TableCell>
                    <TableCell>{getStatusBadge(grn.status)}</TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex gap-2 justify-end">
                        {grn.status === 'PENDING_APPROVAL' && (profile?.role === UserRole.PROJECT_MANAGER || profile?.role === UserRole.ADMIN) && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(grn.id);
                              }}
                              className="h-8 border-green-200 text-green-700 hover:bg-green-50 gap-1 px-3 rounded-lg"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await GRNService.updateStatus(grn.id, 'REJECTED');
                                  toast.success('GRN Rejected');
                                } catch (err) {
                                  toast.error('Rejection failed');
                                }
                              }}
                              className="h-8 border-red-200 text-red-700 hover:bg-red-50 gap-1 px-3 rounded-lg"
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
              {paginatedGrns.length === 0 && (
                <TableRow>
                   <TableCell colSpan={7} className="h-64 text-center">
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
          
          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100">
             {paginatedGrns.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">No GRN records found.</div>
             ) : paginatedGrns.map((grn) => {
                const po = pos.find(p => p.id === grn.poId);
                return (
                   <div 
                     key={grn.id} 
                     className="p-4 flex flex-col gap-3 group hover:bg-slate-50/50 transition-colors cursor-pointer"
                     onClick={() => {
                        setSelectedGrn(grn);
                        setIsDetailOpen(true);
                     }}
                   >
                      <div className="flex justify-between items-start">
                         <div className="flex flex-col">
                            <span className="font-mono text-sm font-bold text-slate-900 group-hover:text-blue-600 group-hover:underline block">{grn.grnNumber}</span>
                            <span className="font-mono text-[10px] text-slate-500 mt-0.5 block tracking-wider">PO: {po?.poNumber || `#${grn.poId.slice(-6)}`}</span>
                         </div>
                         {getStatusBadge(grn.status)}
                      </div>
                      
                      <div className="flex justify-between items-end border border-slate-100 bg-slate-50 p-2 rounded-lg">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Site</span>
                            <span className="text-xs font-semibold text-slate-700">{grn.siteLocation}</span>
                         </div>
                         <Badge variant="outline" className="text-[9px] uppercase font-bold border-slate-200 text-slate-500 bg-white">
                           {grn.receiptType?.replace(/_/g, ' ') || 'STANDARD'}
                         </Badge>
                      </div>

                      <div className="flex justify-between items-center text-xs mt-1 border-t border-slate-100 pt-2">
                         <span className="text-slate-500 font-medium font-mono">{new Date(grn.createdAt).toLocaleDateString()}</span>
                         <div className="flex gap-2 justify-end">
                            {grn.status === 'PENDING_APPROVAL' && (profile?.role === UserRole.PROJECT_MANAGER || profile?.role === UserRole.ADMIN) && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(grn.id);
                                  }}
                                  className="h-8 border-green-200 text-green-700 hover:bg-green-50 rounded-lg px-2"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await GRNService.updateStatus(grn.id, 'REJECTED');
                                      toast.success('GRN Rejected');
                                    } catch (err) {
                                      toast.error('Rejection failed');
                                    }
                                  }}
                                  className="h-8 border-red-200 text-red-700 hover:bg-red-50 rounded-lg px-2"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                         </div>
                      </div>
                   </div>
                );
             })}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
            <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
              Page {currentPage} of {totalPages} <span className="text-slate-200 mx-2">|</span> Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredGrns.length)}-{Math.min(currentPage * itemsPerPage, filteredGrns.length)} of {filteredGrns.length} GRN Records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              
              {getPageNumbers().map((page, index) => {
                if (typeof page === 'string') {
                  return <span key={`ellipse-${index}`} className="text-slate-400 font-mono text-xs px-1 font-bold">...</span>;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 w-9 p-0 rounded-lg font-mono font-bold transition-all ${
                      currentPage === page ? "bg-primary shadow-sm shadow-primary/10 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
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
                className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
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
            <DialogTitle className="flex justify-between items-center pr-8">
              <span>GRN Details</span>
              <span className="text-sm font-mono text-slate-400">{selectedGrn?.grnNumber}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedGrn && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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

              <div className="border border-slate-100 rounded-sm overflow-x-auto">
                <Table compact>
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
