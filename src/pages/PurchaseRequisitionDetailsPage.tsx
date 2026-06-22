import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  addDoc,
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  PurchaseRequisition, 
  Project, 
  Product, 
  Vendor, 
  Stock, 
  MAIN_WAREHOUSE_PROJECT_ID,
  UserRole,
  PRComment,
  MovementType,
  PRAuditLog
} from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PRService,
  POService
} from '@/services/store';
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
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  MessageSquare, 
  FileText, 
  Paperclip, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Truck,
  Building2,
  User,
  Calendar,
  Send,
  Plus,
  RefreshCw,
  Trash2,
  Search
} from 'lucide-react';
import { MaterialSelector } from '@/components/MaterialSelector';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { cleanObject } from '@/lib/utils';

export default function PurchaseRequisitionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [pr, setPr] = useState<PurchaseRequisition | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requester, setRequester] = useState<{ name: string; email: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<Record<string, Stock>>({});
  
  const getProjectName = (idOrName: string) => {
    const project = projects.find(p => p.id === idOrName || p.name === idOrName);
    return project ? project.name : idOrName || 'Unknown Project';
  };
  const getVendorName = (idOrName: string) => {
    const vendor = vendors.find(v => v.id === idOrName || v.name === idOrName);
    return vendor ? vendor.name : idOrName || 'Unknown Vendor';
  };
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editablePr, setEditablePr] = useState<PurchaseRequisition | null>(null);
  
  const [commentText, setCommentText] = useState('');
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PM_APPROVE' | 'SUBMIT_FOR_REVIEW';
    remarks: string;
  }>({
    open: false,
    type: 'APPROVE',
    remarks: ''
  });

  useEffect(() => {
    if (!id) return;

    const unsubPR = onSnapshot(doc(db, 'purchaseRequisitions', id), async (docSnap) => {
      if (docSnap.exists()) {
        const prData = { id: docSnap.id, ...docSnap.data() } as PurchaseRequisition;
        // Ensure remarks is at least an empty string to avoid undefined errors in form fields
        if (prData.remarks === undefined) prData.remarks = '';
        
        setPr(prData);
        if (!editMode) setEditablePr(prData);
        
        // Fetch project
        const projSnap = await getDoc(doc(db, 'projects', prData.projectId));
        if (projSnap.exists()) {
          setProject({ id: projSnap.id, ...projSnap.data() } as Project);
        }

        // Fetch requester profile
        const userSnap = await getDoc(doc(db, 'users', prData.requesterId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setRequester({ name: userData.name, email: userData.email });
        }
      } else {
        toast.error('Purchase requisition not found');
        navigate('/requisitions');
      }
      setLoading(false);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      setVendors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    });

    const qStocks = query(collection(db, 'stocks'), where('projectId', '==', MAIN_WAREHOUSE_PROJECT_ID));
    const unsubStocks = onSnapshot(qStocks, (snapshot) => {
      const stockMap: Record<string, Stock> = {};
      snapshot.forEach((doc) => {
        const item = doc.data() as Stock;
        stockMap[item.productId] = item;
      });
      setWarehouseStocks(stockMap);
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    });

    return () => {
      unsubPR();
      unsubProducts();
      unsubVendors();
      unsubStocks();
      unsubProjects();
    };
  }, [id, navigate]);

  const handleAction = async () => {
    if (!pr || !id || !user) return;
    
    setProcessing(true);
    try {
      let status: PurchaseRequisition['status'];
      let historyStatus: string;
      let historyNotes = actionModal.remarks;

      switch (actionModal.type) {
        case 'SUBMIT_FOR_REVIEW':
          status = 'UNDER_REVIEW';
          historyStatus = 'SUBMITTED_FOR_REVIEW';
          break;
        case 'PM_APPROVE':
          status = 'PM_APPROVED';
          historyStatus = 'PM_APPROVED';
          break;
        case 'APPROVE':
          status = 'ADMIN_APPROVED';
          historyStatus = 'ADMIN_APPROVED';
          break;
        case 'REJECT':
          status = 'REJECTED';
          historyStatus = 'REJECTED';
          break;
        case 'REQUEST_CHANGES':
          status = 'CHANGES_REQUESTED';
          historyStatus = 'CHANGES_REQUESTED';
          break;
        default:
          return;
      }

      await PRService.updateStatus(id, status, user.uid, profile?.name || 'System User', historyNotes);

      // Log to stock movements for final approval/rejection only
      if (status === 'ADMIN_APPROVED' || status === 'REJECTED') {
        const movementPromises = pr.items.map(item => {
          const prod = products.find(p => p.id === item.productId);
          return addDoc(collection(db, 'stockMovements'), cleanObject({
            productId: item.productId,
            productName: prod?.name || 'Unknown Product',
            sku: prod?.sku || 'N/A',
            projectId: pr.projectId,
            projectName: project?.name || 'Unknown Project',
            type: status === 'ADMIN_APPROVED' ? MovementType.PR_APPROVED : MovementType.PR_REJECTED,
            quantity: item.quantity,
            currentStock: 0,
            userName: profile?.name || 'System User',
            userId: user.uid,
            referenceId: id,
            referenceType: 'PURCHASE_REQUISITION',
            remarks: historyNotes || `${status} by approver`,
            createdAt: new Date().toISOString()
          }));
        });
        await Promise.all(movementPromises);
      }

      // Add as comment too if there's remarks
      if (historyNotes.trim()) {
        const comment: PRComment = {
          id: Math.random().toString(36).substr(2, 9),
          userId: user.uid,
          userName: profile?.name || 'System User',
          text: historyNotes,
          type: actionModal.type === 'REJECT' ? 'REJECTION' : (actionModal.type === 'APPROVE' || actionModal.type === 'PM_APPROVE' ? 'APPROVAL' : 'CHANGE_REQUEST'),
          createdAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'purchaseRequisitions', id), cleanObject({
          comments: [...(pr.comments || []), comment]
        }));
      }

      toast.success(`Purchase Requisition ${status.replace('_', ' ')}`);
      setActionModal({ ...actionModal, open: false, remarks: '' });
    } catch (err) {
      console.error(err);
      toast.error('Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editablePr || !id || !user) return;
    
    setProcessing(true);
    try {
      const auditLogs: PRAuditLog[] = [];
      const now = new Date().toISOString();
      const userName = profile?.name || 'System User';

      // Simple audit comparison for top level fields
      if (editablePr.urgency !== pr?.urgency) {
        auditLogs.push({
          id: Math.random().toString(36).substr(2, 9),
          field: 'Priority',
          oldValue: pr?.urgency,
          newValue: editablePr.urgency,
          userId: user.uid,
          userName,
          timestamp: now,
          reason: 'Review Adjustment'
        });
      }

      if (editablePr.remarks !== pr?.remarks) {
        auditLogs.push({
          id: Math.random().toString(36).substr(2, 9),
          field: 'Remarks',
          oldValue: pr?.remarks,
          newValue: editablePr.remarks,
          userId: user.uid,
          userName,
          timestamp: now,
          reason: 'Review Adjustment'
        });
      }

      // Check for removed items
      pr?.items.forEach(oldItem => {
        const stillExists = editablePr.items.find(newItem => newItem.productId === oldItem.productId);
        if (!stillExists) {
          const prod = products.find(p => p.id === oldItem.productId);
          auditLogs.push({
            id: Math.random().toString(36).substr(2, 9),
            field: 'Material Removed',
            oldValue: prod?.name || oldItem.productId,
            newValue: 'NONE',
            userId: user.uid,
            userName,
            timestamp: now,
            reason: 'Project Manager Optimization'
          });
        }
      });

      // Check for added or modified items
      editablePr.items.forEach((newItem, idx) => {
        const oldItem = pr?.items.find(i => i.productId === newItem.productId);
        const prod = products.find(p => p.id === newItem.productId);
        
        if (!oldItem) {
          auditLogs.push({
            id: Math.random().toString(36).substr(2, 9),
            field: 'Material Added',
            oldValue: 'NONE',
            newValue: `${prod?.name || newItem.productId} (${newItem.quantity} ${prod?.uom || ''})`,
            userId: user.uid,
            userName,
            timestamp: now,
            reason: 'Review Addition'
          });
        } else if (oldItem.quantity !== newItem.quantity) {
          auditLogs.push({
            id: Math.random().toString(36).substr(2, 9),
            field: `Quantity: ${prod?.name}`,
            oldValue: oldItem.quantity,
            newValue: newItem.quantity,
            userId: user.uid,
            userName,
            timestamp: now,
            reason: 'Requirement Correction'
          });
        }
      });

      const totalEstimatedAmount = editablePr.items.reduce((acc, item) => acc + (item.quantity * item.estimatedPrice), 0);

      await PRService.updateWithAudit(id, {
        items: editablePr.items,
        urgency: editablePr.urgency,
        remarks: editablePr.remarks,
        totalEstimatedAmount
      }, auditLogs);

      toast.success('Changes saved successfully');
      setEditMode(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally {
      setProcessing(false);
    }
  };

  const updateItemQty = (index: number, qty: number) => {
    if (!editablePr) return;
    const newItems = [...editablePr.items];
    newItems[index] = { ...newItems[index], quantity: qty };
    setEditablePr({ ...editablePr, items: newItems });
  };

  const updateItemPrice = (index: number, price: number) => {
    if (!editablePr) return;
    const newItems = [...editablePr.items];
    newItems[index] = { ...newItems[index], estimatedPrice: price };
    setEditablePr({ ...editablePr, items: newItems });
  };

  const removeItem = (index: number) => {
    if (!editablePr) return;
    const newItems = editablePr.items.filter((_, i) => i !== index);
    setEditablePr({ ...editablePr, items: newItems });
  };

  const addItem = () => {
    if (!editablePr) return;
    const newItem = {
      productId: '',
      quantity: 1,
      estimatedPrice: 0
    };
    setEditablePr({
      ...editablePr,
      items: [...editablePr.items, newItem]
    });
  };

  const replaceItem = (index: number, productId: string) => {
    if (!editablePr) return;
    const product = products.find(p => p.id === productId);
    const newItems = [...editablePr.items];
    newItems[index] = {
      ...newItems[index],
      productId,
      estimatedPrice: product?.unitPrice || 0
    };
    setEditablePr({ ...editablePr, items: newItems });
  };

  const handleIssueFromWarehouse = async () => {
    if (!pr || !id || !user) return;
    setProcessing(true);
    try {
      await PRService.fulfillFromWarehouse(id, user.uid, profile?.name || 'System User');
      toast.success('Warehouse fulfillment processed. Check inventory status.');
    } catch (err) {
      console.error(err);
      toast.error('Warehouse fulfillment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleConvertToPO = async () => {
    if (!pr || !id || !user) return;
    
    // Procurement Formula:
    // warehouseFulfillmentQuantity = MIN(warehouseStock, requestedQuantity)
    // procurementQuantity = MAX(0, requestedQuantity - warehouseStock)
    
    const itemsToProcure: any[] = [];
    const itemsToReserve: any[] = [];

    pr.items.forEach(item => {
      const stock = warehouseStocks[item.productId];
      const physicalStock = stock?.quantity || 0;
      const reserved = stock?.reservedQuantity || 0;
      const available = Math.max(0, physicalStock - reserved);
      
      const fulfillmentQty = Math.min(available, item.quantity);
      const procQty = Math.max(0, item.quantity - fulfillmentQty);

      if (fulfillmentQty > 0) {
        itemsToReserve.push({ ...item, fulfillmentQty });
      }
      if (procQty > 0) {
        itemsToProcure.push({ ...item, procQty });
      }
    });

    if (itemsToProcure.length === 0 && itemsToReserve.length > 0) {
      toast.info('All materials are available in warehouse. Use "Issue From Warehouse" instead.');
      return;
    }

    setProcessing(true);
    try {
      // 1. Reserve Available Stock first
      if (itemsToReserve.length > 0) {
        await PRService.reserveStock(id, user.uid, profile?.name || 'System User');
      }

      // 2. Generate PO ONLY for shortage quantities
      const poNum = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      await POService.add({
        poNumber: poNum,
        projectId: pr.projectId,
        vendorId: pr.vendorId || '',
        prId: id,
        linkedMrNumber: pr.linkedMrNumber,
        status: 'DRAFT',
        items: itemsToProcure.map(i => ({
          productId: i.productId,
          quantityOrdered: i.procQty,
          quantityReceived: 0,
          unitPrice: i.estimatedPrice
        })),
        taxPercent: 0,
        discountAmount: 0,
        totalAmount: itemsToProcure.reduce((acc, curr) => acc + (curr.procQty * curr.estimatedPrice), 0),
        createdAt: new Date().toISOString()
      });

      await PRService.update(id, { 
        status: 'CONVERTED_TO_PO',
        history: arrayUnion({
          status: 'PARTIAL_PROCUREMENT_CREATED',
          userId: user.uid,
          userName: profile?.name || 'System User',
          timestamp: new Date().toISOString(),
          notes: `Reserved ${itemsToReserve.length} available items and created Purchase Order ${poNum} for ${itemsToProcure.length} shortage items.`
        })
      } as any);

      toast.success(`Reserved stock and generated PO ${poNum} for shortages`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to process procurement');
    } finally {
      setProcessing(false);
    }
  };

  const addComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !pr || !id || !user) return;

    try {
      const comment: PRComment = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.uid,
        userName: profile?.name || 'System User',
        text: commentText,
        type: 'INTERNAL',
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'purchaseRequisitions', id), cleanObject({
        comments: [...(pr.comments || []), comment]
      }));
      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADMIN_APPROVED':
      case 'APPROVED': return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'REJECTED': return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'CONVERTED_TO_PO': return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200"><Truck className="w-3 h-3 mr-1" /> Converted to PO</Badge>;
      case 'DRAFT': return <Badge className="bg-slate-100 text-slate-700 border-slate-200"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
      case 'UNDER_REVIEW': return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" /> Under Review</Badge>;
      case 'PM_APPROVED': return <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200"><CheckCircle2 className="w-3 h-3 mr-1" /> PM Approved</Badge>;
      case 'PENDING_APPROVAL': return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>;
      case 'CHANGES_REQUESTED': return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Changes Requested</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pr) return null;

  // Warehouse Analysis Calculations
  const analysis = {
    totalRequested: pr.items.reduce((acc, i) => acc + i.quantity, 0),
    availableInWarehouse: pr.items.reduce((acc, i) => {
      const stock = warehouseStocks[i.productId];
      return acc + (stock ? Math.max(0, stock.quantity - (stock.reservedQuantity || 0)) : 0);
    }, 0),
    reservedInWarehouse: pr.items.reduce((acc, i) => {
      const stock = warehouseStocks[i.productId];
      return acc + (stock?.reservedQuantity || 0);
    }, 0),
    procurementRequired: pr.items.reduce((acc, i) => {
      const stock = warehouseStocks[i.productId];
      const available = stock ? Math.max(0, stock.quantity - (stock.reservedQuantity || 0)) : 0;
      return acc + Math.max(0, i.quantity - available);
    }, 0)
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="h-10 w-10 p-0 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">PR-{id?.slice(-8).toUpperCase()}</h1>
              {getStatusBadge(pr.status)}
            </div>
            <p className="text-slate-500 text-sm mt-1">Generated on {format(new Date(pr.createdAt), 'PPP')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
      {/* Requisitioner Actions */}
          {(pr.status === 'DRAFT' || pr.status === 'CHANGES_REQUESTED') && pr.requesterId === user.uid && (
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setActionModal({ open: true, type: 'SUBMIT_FOR_REVIEW', remarks: '' })}
            >
              Submit For PM Review
            </Button>
          )}

          {/* PM Review Actions */}
          {pr.status === 'UNDER_REVIEW' && (profile?.role === UserRole.PROJECT_MANAGER || profile?.role === UserRole.ADMIN) && (
            <div className="flex items-center gap-2">
              {!editMode ? (
                <>
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    Edit Requisition
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setActionModal({ open: true, type: 'REJECT', remarks: '' })}
                  >
                    Reject
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => setActionModal({ open: true, type: 'REQUEST_CHANGES', remarks: '' })}
                  >
                    Request Changes
                  </Button>
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => setActionModal({ open: true, type: 'PM_APPROVE', remarks: '' })}
                  >
                    Approve as PM
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditMode(false);
                    setEditablePr(pr);
                  }}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveChanges} disabled={processing}>Save Review Changes</Button>
                </div>
              )}
            </div>
          )}

          {/* Admin Final Approval Actions */}
          {pr.status === 'PM_APPROVED' && profile?.role === UserRole.ADMIN && (
            <>
              <Button 
                variant="outline" 
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setActionModal({ open: true, type: 'REJECT', remarks: '' })}
              >
                Reject
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setActionModal({ open: true, type: 'APPROVE', remarks: '' })}
              >
                Final Admin Approval
              </Button>
            </>
          )}

          {/* Post-Approval Procurement Actions */}
          {pr.status === 'ADMIN_APPROVED' && profile?.role === UserRole.ADMIN && (
            <div className="flex gap-2 text-xs">
              <Button 
                variant="outline"
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={handleIssueFromWarehouse}
                disabled={processing}
              >
                Issue from Warehouse
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                onClick={handleConvertToPO}
                disabled={processing}
              >
                Process Procurement
              </Button>
            </div>
          )}
        </div>
      </div>

      <WorkflowProgress currentStep="PR" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Request Info */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest">PR Number</p>
                  <p className="text-sm font-semibold text-slate-900">PR-{id?.toUpperCase()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest">Project</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-semibold">{getProjectName(pr.projectId)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest">Requested By</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold">{requester?.name || pr.requesterName || 'Loading...'}</p>
                      {requester?.email && <p className="text-[10px] text-slate-400 font-mono">{requester.email}</p>}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest">Request Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-semibold">{format(new Date(pr.createdAt), 'PPP')}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest">Priority</p>
                  {editMode ? (
                    <select 
                      className="text-xs border border-slate-200 rounded p-1 w-full"
                      value={editablePr?.urgency}
                      onChange={(e) => setEditablePr(prev => prev ? { ...prev, urgency: e.target.value as any } : null)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="EMERGENCY">EMERGENCY</option>
                    </select>
                  ) : (
                    <Badge className={`uppercase text-[10px] h-5 ${
                      pr.urgency === 'EMERGENCY' ? 'bg-red-600' : 
                      pr.urgency === 'HIGH' ? 'bg-red-500' : 
                      pr.urgency === 'MEDIUM' ? 'bg-orange-500' : 
                      'bg-slate-400'
                    }`}>
                      {pr.urgency}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest">Preferred Vendor</p>
                  <p className="text-sm font-semibold text-slate-900">{pr.vendorId ? getVendorName(pr.vendorId) : 'None'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest">Estimated Value</p>
                  <p className="text-lg font-bold text-slate-900 italic font-serif">
                    ₹{(editMode ? editablePr?.items.reduce((acc, item) => acc + (item.quantity * item.estimatedPrice), 0) : pr.totalEstimatedAmount)?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {(pr.remarks || editMode) && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-[10px] uppercase font-mono text-slate-400 font-bold tracking-widest mb-2">Requester Remarks</p>
                  {editMode ? (
                    <Textarea 
                      value={editablePr?.remarks} 
                      onChange={(e) => setEditablePr(prev => prev ? { ...prev, remarks: e.target.value } : null)}
                      className="text-sm italic"
                    />
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-600 leading-relaxed italic">"{pr.remarks}"</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material Information */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 text-slate-400" />
                Material Information
              </CardTitle>
              {editMode && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                  onClick={addItem}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Material
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-mono text-[10px] uppercase">Material Name</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-center">Req. Qty</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-center">Wh. Stock</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-center">Wh. Fulfillment</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-right">Procurement Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editMode ? editablePr?.items : pr.items)?.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    const stock = warehouseStocks[item.productId];
                    const physicalStock = stock?.quantity || 0;
                    const reserved = stock?.reservedQuantity || 0;
                    const available = Math.max(0, physicalStock - reserved);
                    const fulfillmentQty = Math.min(item.quantity, available);
                    const procQty = Math.max(0, item.quantity - fulfillmentQty);
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="max-w-[200px]">
                          {editMode ? (
                            <MaterialSelector 
                              products={products}
                              selectedProductId={item.productId}
                              onSelect={(id) => replaceItem(idx, id)}
                              warehouseStocks={(Object.entries(warehouseStocks) as [string, Stock][]).reduce((acc, [pid, stock]) => {
                                acc[pid] = stock.quantity;
                                return acc;
                              }, {} as Record<string, number>)}
                            />
                          ) : (
                            <>
                              <div className="font-semibold text-slate-900">{product?.name || 'Unknown'}</div>
                              <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{product?.sku || 'N/A'}</div>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editMode ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <Input 
                                  type="number" 
                                  className="w-16 h-8 text-center text-xs" 
                                  value={item.quantity} 
                                  onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                                />
                                <span className="text-xs text-slate-400">{product?.uom || '-'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="font-bold">{item.quantity} {product?.uom}</div>
                              <div className="text-[9px] text-slate-400">@ ₹{item.estimatedPrice}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-slate-500 font-mono text-xs">
                          {physicalStock} {product?.uom || '-'}
                        </TableCell>
                        <TableCell className="text-center font-bold text-indigo-600">
                          {fulfillmentQty} {product?.uom || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant={procQty > 0 ? "destructive" : "outline"} className="font-bold">
                              {procQty} {product?.uom || '-'}
                            </Badge>
                            {editMode && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeItem(idx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-400" />
                Discussion & Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {pr.comments && pr.comments.length > 0 ? (
                    pr.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">{comment.userName}</h4>
                            <span className="text-[10px] text-slate-400">{format(new Date(comment.createdAt), 'MMM d, HH:mm')}</span>
                          </div>
                          <div className={`p-3 rounded-2xl text-sm ${
                            comment.type === 'APPROVAL' ? 'bg-green-50 text-green-700 border border-green-100' :
                            comment.type === 'REJECTION' ? 'bg-red-50 text-red-700 border border-red-100' :
                            comment.type === 'CHANGE_REQUEST' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}>
                            {comment.text}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 italic">No comments yet. Start a discussion below.</div>
                  )}
                </div>

                <form onSubmit={addComment} className="flex gap-3 pt-4 border-t border-slate-100">
                  <Input 
                    placeholder="Type a internal comment..." 
                    className="flex-1" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <Button type="submit" size="icon" className="shrink-0" disabled={!commentText.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Warehouse Analysis */}
          <Card className="border-slate-200 shadow-sm bg-slate-900 text-white overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/10">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Warehouse Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase font-mono text-slate-500 font-bold tracking-widest">Total Requested</p>
                  <p className="text-3xl font-bold">{analysis.totalRequested}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-mono text-slate-500 font-bold tracking-widest">Available</p>
                  <p className="text-xl font-bold text-green-400">{analysis.availableInWarehouse}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Reserved Quantity</span>
                  <span className="font-mono">{analysis.reservedInWarehouse}</span>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${(analysis.reservedInWarehouse / (analysis.totalRequested || 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-red-400 font-bold">Procurement Required</span>
                  <span className="font-mono text-red-400 font-black">{analysis.procurementRequired}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 text-[10px] text-slate-500 italic">
                * Available quantity excludes reserved items for other priority projects.
              </div>
            </CardContent>
          </Card>

          {/* Timeline / History */}
          <Card className="border-slate-200 shadow-sm h-fit">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {/* Created */}
                <div className="relative pl-8 pb-2">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Requisition Created</h4>
                    <p className="text-[10px] text-slate-400">{format(new Date(pr.createdAt), 'PPpp')}</p>
                    <p className="text-[10px] text-slate-500 mt-1">by {pr.requesterName || 'Site Supervisor'}</p>
                  </div>
                </div>

                {/* History Entries */}
                {Array.isArray(pr.history) && pr.history.map((entry, idx) => (
                  <div key={idx} className="relative pl-8 pb-2">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center ${
                      entry.status === 'APPROVED' ? 'border-green-500' : 
                      entry.status === 'REJECTED' ? 'border-red-500' :
                      'border-blue-500'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        entry.status === 'APPROVED' ? 'bg-green-500' : 
                        entry.status === 'REJECTED' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}></div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{entry.status.replace('_', ' ')}</h4>
                      <p className="text-[10px] text-slate-400">{format(new Date(entry.timestamp), 'PPpp')}</p>
                      <p className="text-[10px] text-slate-500 mt-1">by {entry.userName}</p>
                      {entry.notes && (
                        <p className="text-[10px] bg-slate-50 p-2 rounded-lg mt-2 italic text-slate-600 border border-slate-100">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Current State Indicator */}
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest leading-none mb-1">Current Status</h4>
                    <p className="text-sm font-bold text-slate-900">{pr.status.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs */}
          {pr.auditLogs && pr.auditLogs.length > 0 && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Modification Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                {pr.auditLogs.map((log) => (
                  <div key={log.id} className="text-[11px] p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900">{log.field} Updated</span>
                      <span className="text-slate-400 font-mono">{format(new Date(log.timestamp), 'HH:mm')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <p className="text-[9px] uppercase text-slate-400 font-bold">Old Value</p>
                        <p className="truncate text-slate-600 line-through decoration-red-300">{String(log.oldValue)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-slate-400 font-bold">New Value</p>
                        <p className="truncate text-green-600 font-bold">{String(log.newValue)}</p>
                      </div>
                    </div>
                    <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 italic">Reason: {log.reason}</span>
                      <span className="font-bold text-slate-700">{log.userName}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-slate-400" />
                Attachments
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <Plus className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {pr.attachments && pr.attachments.length > 0 ? (
                  pr.attachments.map((file, idx) => (
                    <a 
                      key={idx} 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <FileText className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{file.type} • {format(new Date(file.uploadedAt), 'MMM d, yyyy')}</p>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                    <Paperclip className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 italic">No files attached to this request.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog 
        open={actionModal.open} 
        onOpenChange={(open) => setActionModal({ ...actionModal, open })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionModal.type === 'APPROVE' && 'Confirm Final Approval'}
              {actionModal.type === 'PM_APPROVE' && 'Confirm PM Review'}
              {actionModal.type === 'SUBMIT_FOR_REVIEW' && 'Submit for Review'}
              {actionModal.type === 'REJECT' && 'Confirm Rejection'}
              {actionModal.type === 'REQUEST_CHANGES' && 'Request Changes'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-sm text-slate-500">
              {actionModal.type === 'APPROVE' && 'Are you sure you want to approve this purchase requisition? This will allow it to be converted into a Purchase Order.'}
              {actionModal.type === 'PM_APPROVE' && 'Confirm Project Manager review. This will send the requisition to Admin for final approval.'}
              {actionModal.type === 'SUBMIT_FOR_REVIEW' && 'Submit this requisition for project manager review?'}
              {actionModal.type === 'REJECT' && 'Please provide a reason for rejecting this requisition. This action cannot be undone.'}
              {actionModal.type === 'REQUEST_CHANGES' && 'Clarify what changes are needed before this requisition can be approved.'}
            </p>
            <div className="space-y-2">
              <Label className="font-bold">Remarks / Instructions</Label>
              <Textarea 
                placeholder="Enter remarks here..."
                className="min-h-[120px]"
                value={actionModal.remarks}
                onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setActionModal({ ...actionModal, open: false })}>
              Cancel
            </Button>
            <Button 
              className={
                (actionModal.type === 'APPROVE' || actionModal.type === 'PM_APPROVE' || actionModal.type === 'SUBMIT_FOR_REVIEW') ? 'bg-green-600 hover:bg-green-700' :
                actionModal.type === 'REJECT' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
              onClick={handleAction}
              disabled={processing || (['REJECT', 'REQUEST_CHANGES'].includes(actionModal.type) && !actionModal.remarks.trim())}
            >
              {processing ? 'Processing...' : 'Confirm Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
