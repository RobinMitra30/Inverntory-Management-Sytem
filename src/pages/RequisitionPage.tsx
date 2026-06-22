import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, addDoc, doc, query, where, onSnapshot, getDocs, orderBy, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PRService, ProjectService, ProductService, VendorService } from '@/services/store';
import { PurchaseRequisition, Project, Product, Vendor, MovementType, Stock, MAIN_WAREHOUSE_PROJECT_ID } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Button, buttonVariants } from '@/components/ui/button';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { cn } from '@/lib/utils';
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
import { Plus, FileText, CheckCircle2, XCircle, Clock, Trash2, Store, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cleanObject } from '@/lib/utils';
import { MaterialSelector } from '@/components/MaterialSelector';
import { VendorSelector } from '@/components/VendorSelector';
import { WarehouseAvailability } from '@/components/WarehouseAvailability';

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
  const { user, profile } = useAuth();
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>('MEDIUM');
  const [items, setItems] = useState<{ productId: string; quantity: number; estimatedPrice: number }[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<Record<string, number>>({});

  useEffect(() => {
    const qStocks = query(collection(db, 'stocks'), where('projectId', '==', MAIN_WAREHOUSE_PROJECT_ID));
    const unsubscribeStocks = onSnapshot(qStocks, (snapshot) => {
      const stockMap: Record<string, number> = {};
      snapshot.forEach((doc) => {
        const item = doc.data() as Stock;
        stockMap[item.productId] = item.quantity || 0;
      });
      setWarehouseStocks(stockMap);
    });
    return () => unsubscribeStocks();
  }, []);

  useEffect(() => {
    const unsubPR = PRService.subscribe(setRequisitions);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubVendors = VendorService.subscribe(setVendors);
    return () => { unsubPR(); unsubProjects(); unsubProducts(); unsubVendors(); };
  }, []);

  const getProjectName = (idOrName: string) => {
    const project = projects.find(p => p.id === idOrName || p.name === idOrName);
    return project ? project.name : idOrName || 'Unknown Project';
  };
  const getVendorName = (idOrName: string) => {
    const vendor = vendors.find(v => v.id === idOrName || v.name === idOrName);
    return vendor ? vendor.name : idOrName || 'Unknown Vendor';
  };

  const [viewMode, setViewMode] = useState<'ALL' | 'EMERGENCY_ONLY'>('ALL');

  const filteredRequisitions = projectIdParam 
    ? requisitions.filter(r => r.projectId === projectIdParam)
    : requisitions;

  const sortedRequisitions = React.useMemo(() => {
    let result = [...filteredRequisitions];
    if (viewMode === 'EMERGENCY_ONLY') {
      result = result.filter(r => r.urgency === 'EMERGENCY');
    }
    return result.sort((a, b) => {
      const aEmergency = a.urgency === 'EMERGENCY' ? 1 : 0;
      const bEmergency = b.urgency === 'EMERGENCY' ? 1 : 0;
      if (aEmergency !== bEmergency) {
        return bEmergency - aEmergency;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [filteredRequisitions, viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [projectIdParam, viewMode]);

  const totalPages = Math.ceil(sortedRequisitions.length / itemsPerPage);
  const paginatedRequisitions = sortedRequisitions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      const prId = await PRService.add({
        projectId,
        requesterId: user.uid,
        requesterName: profile?.name || 'Unknown User',
        vendorId: vendorId || undefined,
        status: 'UNDER_REVIEW',
        items: items.map(i => ({ ...i, quantityReceived: 0 })),
        totalEstimatedAmount: items.reduce((acc, curr) => acc + (curr.quantity * curr.estimatedPrice), 0),
        urgency,
        createdAt: new Date().toISOString()
      });

      if (prId) {
        // Stock Movement Ledger Insertion (Immutable, Timestamped, User Tracked, Project Linked, Material Linked)
        const projectObj = projects.find(p => p.id === projectId);
        const isEmergency = urgency === 'EMERGENCY';
        const movementPromises = items.map(item => {
          const prod = products.find(p => p.id === item.productId);
          return addDoc(collection(db, 'stockMovements'), cleanObject({
            productId: item.productId,
            productName: prod?.name || 'Unknown Product',
            sku: prod?.sku || 'N/A',
            projectId,
            projectName: projectObj?.name || 'Unknown Project',
            type: isEmergency ? MovementType.EMERGENCY_PROCUREMENT : MovementType.PR_CREATED,
            quantity: item.quantity,
            currentStock: 0,
            userName: profile?.name || 'Guest User',
            userId: user.uid,
            referenceId: prId,
            referenceType: 'PURCHASE_REQUISITION',
            remarks: 'Purchase requisition created manually',
            createdAt: new Date().toISOString()
          }));
        });
        await Promise.all(movementPromises);

        await addDoc(collection(db, 'auditLogs'), cleanObject({
          action: 'PR_CREATED',
          entityType: 'purchaseRequisitions',
          entityId: prId,
          details: `Manual PR created by ${profile?.name || 'Unknown'}`,
          performedBy: user.uid,
          userName: profile?.name || 'Guest User',
          createdAt: new Date().toISOString()
        }));

        if (urgency === 'EMERGENCY') {
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'ADMIN'));
            const querySnapshot = await getDocs(q);
            const notificationPromises = querySnapshot.docs.map(uDoc => {
              return addDoc(collection(db, 'notifications'), cleanObject({
                userId: uDoc.id,
                title: '🚨 EMERGENCY REQUISITION!',
                message: `CRITICAL: Emergency Purchase Requisition raised by ${profile?.name || 'user'} for project ${projects.find(p => p.id === projectId)?.name || 'Unknown'}. Immediate action required.`,
                read: false,
                createdAt: new Date().toISOString()
              }));
            });
            await Promise.all(notificationPromises);
            toast.success('🚨 Emergency alert dispatched to Admins!');
          } catch (nErr) {
            console.error('Failed to notify admins:', nErr);
          }
        }
      }

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

  const handleSubmitDraft = async (id: string) => {
    try {
      await PRService.update(id, { status: 'UNDER_REVIEW' });
      // Although it's already created, we can treat draft submission as "CREATED" flow or just an update. We will log PR_CREATED for drafts when they are created via MR shortage.
      toast.success('Requisition submitted for review');
    } catch (err) {
      toast.error('Submission failed');
    }
  };

  const handleConvertToPO = async (pr: PurchaseRequisition) => {
    if (!user) return;
    try {
      // Calculate procurement quantities
      const procurementItems = pr.items.map(item => {
        const whStockQty = warehouseStocks[item.productId] || 0;
        const procQty = Math.max(0, item.quantity - whStockQty);
        return { ...item, procQty };
      }).filter(i => i.procQty > 0);

      if (procurementItems.length === 0) {
        toast.info('No procurement needed. Issue from Warehouse instead.');
        return;
      }

      const poNum = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const poDocRef = await addDoc(collection(db, 'purchaseOrders'), cleanObject({
        poNumber: poNum,
        projectId: pr.projectId,
        vendorId: pr.vendorId || '',
        requesterId: pr.requesterId,
        prId: pr.id,
        linkedMrNumber: pr.linkedMrNumber,
        status: 'DRAFT',
        items: procurementItems.map(i => ({
          productId: i.productId,
          quantityOrdered: i.procQty,
          quantityReceived: 0,
          unitPrice: i.estimatedPrice
        })),
        taxPercent: 0,
        discountAmount: 0,
        totalAmount: procurementItems.reduce((acc, curr) => acc + (curr.procQty * curr.estimatedPrice), 0),
        createdAt: new Date().toISOString()
      }));

      // Stock Movement Ledger
      const isEmergency = pr.urgency === 'EMERGENCY';
      const projectObj = projects.find(p => p.id === pr.projectId);
      const movementPromises = procurementItems.map(item => {
        const prod = products.find(p => p.id === item.productId);
        return addDoc(collection(db, 'stockMovements'), cleanObject({
          productId: item.productId,
          productName: prod?.name || 'Unknown Product',
          sku: prod?.sku || 'N/A',
          projectId: pr.projectId,
          projectName: projectObj?.name || 'Unknown Project',
          type: isEmergency ? MovementType.EMERGENCY_PROCUREMENT : MovementType.PO_CREATED,
          quantity: item.procQty,
          currentStock: 0,
          userName: profile?.name || 'Guest User',
          userId: user.uid,
          referenceId: poDocRef.id,
          referenceType: 'PURCHASE_ORDER',
          referenceNumber: poNum,
          remarks: `Purchase Order created for procurement shortage of PR ${pr.id}`,
          createdAt: new Date().toISOString()
        }));
      });
      await Promise.all(movementPromises);

      if (pr.id) {
         await PRService.update(pr.id, { 
           status: 'CONVERTED_TO_PO',
           history: arrayUnion({
             status: 'PARTIAL_PROCUREMENT_CREATED',
             userId: user.uid,
             userName: profile?.name || 'System User',
             timestamp: new Date().toISOString(),
             notes: `Purchase Order ${poNum} created for shortage.`
           })
         } as any);
      }

      toast.success('Generated PO for shortage quantities');
    } catch (err) {
      console.error(err);
      toast.error('Could not convert to PO');
    }
  };

  const handleIssueFromWarehouseDirect = async (prId: string) => {
    if (!user) return;
    setProcessing(true);
    try {
      await PRService.fulfillFromWarehouse(prId, user.uid, profile?.name || 'System User');
      toast.success('Material Issued from main warehouse');
    } catch (err) {
      toast.error('Warehouse issue failed');
    } finally {
      setProcessing(false);
    }
  }

  const handleAction = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setSelectedPrId(id);
    setActionType(status);
    setAdminRemarks('');
    setApprovalModalOpen(true);
  };

  const submitApprovalAction = async () => {
    if (!user || !selectedPrId) return;
    if (actionType === 'REJECTED' && !adminRemarks.trim()) {
      toast.error('Remarks are required for rejection');
      return;
    }
    
    setProcessing(true);
    try {
      await PRService.update(selectedPrId, {
        status: actionType,
        approverId: user.uid,
        remarks: adminRemarks
      });

      // Stock Movement Ledger Insertion (Immutable, Timestamped, User Tracked, Project Linked, Material Linked)
      const targetPr = requisitions.find(r => r.id === selectedPrId);
      if (targetPr) {
        const isEmergency = targetPr.urgency === 'EMERGENCY';
        const project = projects.find(p => p.id === targetPr.projectId);
        const movementPromises = targetPr.items.map(item => {
          const prod = products.find(p => p.id === item.productId);
          return addDoc(collection(db, 'stockMovements'), cleanObject({
            productId: item.productId,
            productName: prod?.name || 'Unknown Product',
            sku: prod?.sku || 'N/A',
            projectId: targetPr.projectId,
            projectName: project?.name || 'Unknown Project',
            type: isEmergency ? MovementType.EMERGENCY_PROCUREMENT : (actionType === 'APPROVED' ? MovementType.PR_APPROVED : MovementType.PR_REJECTED),
            quantity: item.quantity,
            currentStock: 0,
            userName: profile?.name || 'Guest User',
            userId: user.uid,
            referenceId: selectedPrId,
            referenceType: 'PURCHASE_REQUISITION',
            remarks: adminRemarks || `${actionType === 'APPROVED' ? 'Approved' : 'Rejected'} by admin`,
            createdAt: new Date().toISOString()
          }));
        });
        await Promise.all(movementPromises);
      }

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), cleanObject({
        action: `PR_${actionType}`,
        entityType: 'purchaseRequisitions',
        entityId: selectedPrId,
        details: `Purchase Requisition was ${actionType.toLowerCase()} by ${profile?.name || 'Unknown'}`,
        performedBy: user.uid,
        userName: profile?.name || 'Guest User',
        createdAt: new Date().toISOString()
      }));

      toast.success(`Requisition ${actionType.toLowerCase()}`);
      setApprovalModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADMIN_APPROVED':
      case 'APPROVED': return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
      case 'REJECTED': return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      case 'CONVERTED_TO_PO': return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Ordered</Badge>;
      case 'DRAFT': return <Badge className="bg-slate-100 text-slate-700 border-slate-200 gap-1"><Clock className="w-3 h-3" /> Draft</Badge>;
      case 'UNDER_REVIEW': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><Clock className="w-3 h-3" /> Reviewing</Badge>;
      case 'PM_APPROVED': return <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 gap-1"><CheckCircle2 className="w-3 h-3" /> PM Approved</Badge>;
      case 'PENDING_APPROVAL': return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'CHANGES_REQUESTED': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><AlertCircle className="w-3 h-3" /> Changes</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-700 border-slate-200 gap-1">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <WorkflowProgress currentStep="PR" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Purchase Requisitions</h1>
          <p className="text-slate-500 text-sm">Raise material requests for project sites.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Separate Emergency View Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Queue ({filteredRequisitions.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('EMERGENCY_ONLY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'EMERGENCY_ONLY' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-red-400 ${viewMode !== 'EMERGENCY_ONLY' ? 'animate-ping' : ''}`}></span>
              Emergency View ({filteredRequisitions.filter(r => r.urgency === 'EMERGENCY').length})
            </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Assign to Project</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Project">
                           {getProjectName(projectId)}
                        </SelectValue>
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
                        <SelectItem value="EMERGENCY">🚨 EMERGENCY</SelectItem>
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
                    <div key={idx} className="border-b border-slate-100 pb-5">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end pb-4">
                           <div className="flex-1 space-y-2">
                              <Label className="text-[10px] uppercase font-mono">Product</Label>
                              <MaterialSelector 
                                 products={products}
                                 selectedProductId={item.productId}
                                 onSelect={(v) => updateItem(idx, 'productId', v)}
                                 warehouseStocks={warehouseStocks}
                              />
                           </div>
                           <div className="flex gap-3 w-full sm:w-auto">
                              <div className="w-full sm:w-24 space-y-2">
                                 <Label className="text-[10px] uppercase font-mono">Qty</Label>
                                 <Input 
                                    type="number" 
                                    className="h-9" 
                                    value={isNaN(item.quantity) ? 0 : item.quantity} 
                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                                 />
                              </div>
                              <div className="w-full sm:w-32 space-y-2">
                                 <Label className="text-[10px] uppercase font-mono">Est. Price</Label>
                                 <Input 
                                    type="number" 
                                    className="h-9" 
                                    value={isNaN(item.estimatedPrice) ? 0 : item.estimatedPrice} 
                                    onChange={(e) => updateItem(idx, 'estimatedPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                                 />
                              </div>
                           </div>
                           <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600 self-end shrink-0" onClick={() => removeItem(idx)}>
                              <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                        {item.productId ? (
                          <WarehouseAvailability whStock={warehouseStocks[item.productId] || 0} requested={item.quantity || 0} />
                        ) : null}
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
      </div>

      <div className="bg-white border border-slate-200 rounded-sm">
        <div className="overflow-x-auto w-full">
          <div className="hidden md:block min-w-full">
        <Table compact>
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
            {paginatedRequisitions.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell className="font-mono text-xs text-slate-400 uppercase">
                   <Link to={`/requisitions/${pr.id}`} className="font-bold text-orange-600 hover:underline">
                      {pr.id?.slice(-8) || 'N/A'}
                   </Link>
                   {pr.linkedMrNumber && (
                     <div className="text-[9px] text-orange-600 tracking-wider mt-1">
                       MR: {pr.linkedMrNumber}
                     </div>
                   )}
                </TableCell>
                <TableCell className="font-bold text-slate-900">
                   {getProjectName(pr.projectId)}
                </TableCell>
                <TableCell>
                   {pr.vendorId ? (
                     <div className="flex items-center gap-1.5 text-slate-600">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        <span>{getVendorName(pr.vendorId)}</span>
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
                     pr.urgency === 'EMERGENCY' ? 'border-red-500 bg-red-50 text-red-650 font-black animate-pulse shadow-sm' : pr.urgency === 'HIGH' ? 'border-red-200 text-red-600 font-bold' : 
                     pr.urgency === 'MEDIUM' ? 'border-orange-200 text-orange-600' : 
                     'border-slate-200 text-slate-600'
                   }`}>
                     {pr.urgency === 'EMERGENCY' ? '🚨 EMERGENCY' : pr.urgency}
                   </Badge>
                </TableCell>
                <TableCell className="font-bold">₹{pr.totalEstimatedAmount?.toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge(pr.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Link 
                      to={`/requisitions/${pr.id}`} 
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 w-7 p-0")}
                      title="View Details"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                    </Link>
                    {pr.status === 'DRAFT' ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleSubmitDraft(pr.id!)}>Submit</Button>
                    ) : (pr.status === 'ADMIN_APPROVED' || pr.status === 'APPROVED') ? (
                       (() => {
                         const procQty = pr.items.reduce((acc, i) => acc + Math.max(0, i.quantity - (warehouseStocks[i.productId] || 0)), 0);
                         if (procQty === 0) {
                           return <Button size="sm" variant="outline" disabled={processing} onClick={() => handleIssueFromWarehouseDirect(pr.id!)} className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50">Issue Stock</Button>;
                         }
                         return <Button size="sm" variant="outline" onClick={() => handleConvertToPO(pr)} className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">Create PO</Button>;
                       })()
                    ) : (
                      <Link 
                        to={`/requisitions/${pr.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-[10px] uppercase font-mono text-slate-400")}
                      >
                        View Status
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedRequisitions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-slate-400 italic">No requisitions found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
           {paginatedRequisitions.length === 0 ? (
             <div className="p-8 text-center text-slate-500 italic">No requisitions found.</div>
           ) : paginatedRequisitions.map((pr) => (
             <div key={pr.id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <Link to={`/requisitions/${pr.id}`} className="font-bold font-mono text-sm text-orange-600 hover:underline flex items-center gap-1.5">
                         {pr.id?.slice(-8) || 'N/A'} <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      {pr.linkedMrNumber && (
                        <div className="text-[10px] text-orange-600 tracking-wider mt-0.5">
                          MR: {pr.linkedMrNumber}
                        </div>
                      )}
                   </div>
                   {getStatusBadge(pr.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-1">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Project</span>
                      <span className="text-xs font-semibold text-slate-900 border border-slate-100 bg-slate-50 rounded px-1.5 py-0.5 w-fit">{getProjectName(pr.projectId)}</span>
                   </div>
                   <div className="flex flex-col justify-end text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Est Total</span>
                      <span className="text-[14px] font-black text-slate-900 font-mono italic leading-none">₹{pr.totalEstimatedAmount?.toLocaleString()}</span>
                   </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-1 border-t border-slate-100 pt-2">
                   <div className="flex items-center gap-1.5 text-slate-600">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      <span>{pr.vendorId ? getVendorName(pr.vendorId) : <span className="italic text-slate-400">No vendor</span>}</span>
                   </div>
                   <div className="font-medium text-slate-500">{pr.items.length} items</div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between gap-4 mt-2">
                   <Badge variant="outline" className={`text-[9px] uppercase font-mono ${
                     pr.urgency === 'EMERGENCY' ? 'border-red-500 bg-red-50 text-red-650 font-black animate-pulse shadow-sm' : pr.urgency === 'HIGH' ? 'border-red-200 text-red-600 font-bold' : 
                     pr.urgency === 'MEDIUM' ? 'border-orange-200 text-orange-600' : 
                     'border-slate-200 text-slate-600'
                   }`}>
                     {pr.urgency === 'EMERGENCY' ? '🚨 EMERGENCY' : pr.urgency}
                   </Badge>
                   <div className="flex gap-2">
                    {pr.status === 'DRAFT' ? (
                      <Button size="sm" variant="outline" className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleSubmitDraft(pr.id!)}>Submit</Button>
                    ) : (pr.status === 'ADMIN_APPROVED' || pr.status === 'APPROVED') ? (
                       (() => {
                         const procQty = pr.items.reduce((acc, i) => acc + Math.max(0, i.quantity - (warehouseStocks[i.productId] || 0)), 0);
                         if (procQty === 0) {
                           return <Button size="sm" variant="outline" disabled={processing} onClick={() => handleIssueFromWarehouseDirect(pr.id!)} className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50">Issue Stock</Button>;
                         }
                         return <Button size="sm" variant="outline" onClick={() => handleConvertToPO(pr)} className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">Create PO</Button>;
                       })()
                    ) : (
                      <Link 
                        to={`/requisitions/${pr.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-[10px] uppercase font-mono text-slate-500 px-3 border border-slate-200")}
                      >
                        View Status
                      </Link>
                    )}
                   </div>
                </div>
             </div>
           ))}
        </div>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 rounded-b-sm">
            <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
              Page {currentPage} of {totalPages} <span className="text-slate-200 mx-2">|</span> Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredRequisitions.length)}-{Math.min(currentPage * itemsPerPage, filteredRequisitions.length)} of {filteredRequisitions.length} Requisitions
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

      {/* Approval Modal */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-sans">
              {actionType === 'APPROVED' ? 'Approve Requisition' : 'Reject Requisition'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">
                Admin Remarks {actionType === 'REJECTED' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className="w-full bg-white border border-slate-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                placeholder={actionType === 'APPROVED' ? "Optional remarks..." : "Please provide a reason for rejection..."}
                rows={4}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)} className="rounded-xl font-bold border-slate-200">
              Cancel
            </Button>
            <Button
              onClick={submitApprovalAction}
              disabled={processing}
              className={`rounded-xl font-bold text-white shadow-sm ${
                actionType === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing ? 'Processing...' : actionType === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
