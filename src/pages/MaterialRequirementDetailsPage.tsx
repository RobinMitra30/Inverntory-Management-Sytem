import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, addDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MaterialRequirement, UserRole, MovementType, MAIN_WAREHOUSE_PROJECT_ID } from '@/types';
import { cleanObject, formatMaterialName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle2, AlertTriangle, User, Building, Calendar, FileText, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export default function MaterialRequirementDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [mr, setMr] = useState<MaterialRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Approval Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const getProjectDisplayName = (projectId: string, proj?: any): string => {
    if (proj?.name && !/^[a-zA-Z0-9]{18,22}$/.test(proj.name)) {
      return proj.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    if (proj?.name && /^[a-zA-Z0-9]{18,22}$/.test(proj.name)) {
      return `Horizon Project (${proj.name.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9]{18,22}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return proj?.name || projectId || 'Grand Horizon Mall';
  };

  useEffect(() => {
    const fetchMr = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'materialRequirements', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMr({ id: docSnap.id, ...docSnap.data() } as MaterialRequirement);
        } else {
          console.error("MR not found");
        }
      } catch (err) {
        console.error("Error fetching MR", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMr();
  }, [id]);

  const handleActionClick = (type: 'APPROVE' | 'REJECT') => {
    setActionType(type);
    setIsModalOpen(true);
    setAdminRemarks('');
  };

  const submitAction = async () => {
    if (!id || !mr) return;
    if (actionType === 'REJECT' && !adminRemarks.trim()) {
      toast.error('Remarks are required for rejection');
      return;
    }

    setProcessing(true);
    try {
      const status = actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const docRef = doc(db, 'materialRequirements', id);
      
      const updateData = {
        status,
        approvalRemarks: adminRemarks,
        approvedBy: profile?.uid,
        approvedByName: profile?.name,
        approvedAt: new Date().toISOString(),
      };
      
      await updateDoc(docRef, updateData);

      if (status === 'APPROVED' && mr.items?.length > 0) {
        const batch = writeBatch(db);
        const productIds = mr.items.map(item => item.productId);
        
        // Split productIds into chunks of 10 for Firestore 'in' query limits
        const stockSnapshots = await Promise.all(
          Array.from({ length: Math.ceil(productIds.length / 10) }, (_, i) =>
            getDocs(query(
              collection(db, 'stocks'),
              where('projectId', '==', MAIN_WAREHOUSE_PROJECT_ID),
              where('productId', 'in', productIds.slice(i * 10, i * 10 + 10))
            ))
          )
        );

        const warehouseStockDocs: Record<string, any> = {};
        stockSnapshots.forEach(snap => {
          snap.forEach(doc => {
            warehouseStockDocs[doc.data().productId] = { id: doc.id, ...doc.data() };
          });
        });

        const prItems = [];
        let reservedAnyCount = 0;
        let partialCount = 0;
        let fullProcurementCount = 0;

        for (const item of mr.items) {
          const stockData = warehouseStockDocs[item.productId];
          
          // Determine local quantities using our new schema properties, with support for legacy records
          const whStock = item.warehouseStock !== undefined ? item.warehouseStock : (stockData?.quantity || 0);
          const reserveQty = item.warehouseFulfillmentQuantity !== undefined ? item.warehouseFulfillmentQuantity : (item.quantityRequested - (item.shortage || 0));
          const procurementQty = item.procurementQuantity !== undefined ? item.procurementQuantity : (item.shortage || 0);
          const fulfillmentType = item.fulfillmentType || (procurementQty === 0 ? 'FULL_WAREHOUSE' : (reserveQty > 0 ? 'PARTIAL_PROCUREMENT' : 'FULL_PROCUREMENT'));

          if (procurementQty > 0) {
            prItems.push({
               productId: item.productId,
               quantity: procurementQty,
               estimatedPrice: 0 
            });
            if (fulfillmentType === 'PARTIAL_PROCUREMENT') {
              partialCount++;
            } else {
              fullProcurementCount++;
            }
          }

          if (reserveQty > 0) {
            reservedAnyCount++;
          }

          // Create MR_APPROVED movement record for each approved item
          const approvedMovRef = doc(collection(db, 'stockMovements'));
          batch.set(approvedMovRef, {
            id: approvedMovRef.id,
            productId: item.productId,
            productName: item.productName || 'Unknown Product',
            sku: stockData?.sku || 'N/A',
            projectId: mr.projectId,
            projectName: mr.projectName,
            type: MovementType.MR_APPROVED,
            quantity: item.quantityRequested,
            currentStock: whStock,
            userName: profile?.name || 'Guest User',
            userId: profile?.uid || 'guest',
            referenceId: mr.id,
            referenceType: 'MATERIAL_REQUIREMENT',
            referenceNumber: mr.mrNumber,
            remarks: adminRemarks || `Approved by ${profile?.name}`,
            createdAt: new Date().toISOString()
          });

          // Reserve in main warehouse
          if (stockData && reserveQty > 0) {
            const stockRef = doc(db, 'stocks', stockData.id);
            const currentReserved = stockData.reservedQuantity || 0;
            const newReserved = currentReserved + reserveQty;
            
            batch.update(stockRef, {
              reservedQuantity: newReserved,
              lastUpdated: new Date().toISOString()
            });

            // Create movement record for internal stock reservation
            const movementRef = doc(collection(db, 'stockMovements'));
            batch.set(movementRef, {
              id: movementRef.id,
              productId: item.productId,
              productName: item.productName,
              sku: stockData.sku || 'N/A',
              projectId: MAIN_WAREHOUSE_PROJECT_ID,
              projectName: 'Main Warehouse',
              type: MovementType.STOCK_RESERVED,
              quantity: reserveQty,
              currentStock: stockData.quantity, // Physical stock remains same
              userName: profile?.name || 'Guest User',
              userId: profile?.uid || 'guest',
              referenceId: mr.id,
              referenceType: 'MATERIAL_REQUIREMENT',
              referenceNumber: mr.mrNumber,
              remarks: `Stock reserved for MR ${mr.mrNumber}`,
              createdAt: new Date().toISOString()
            });
          }
        }

        const isEmergency = (mr as any).urgency === 'EMERGENCY';

        if (prItems.length > 0) {
           const prRef = doc(collection(db, 'purchaseRequisitions'));
           batch.set(prRef, cleanObject({
             projectId: mr.projectId,
             requesterId: profile?.uid || 'system',
             linkedMrId: mr.id,
             linkedMrNumber: mr.mrNumber,
             status: 'DRAFT',
             items: prItems,
             totalEstimatedAmount: 0,
             urgency: isEmergency ? 'EMERGENCY' : 'HIGH',
             remarks: `Auto-generated for MR ${mr.mrNumber} due to stock shortage`,
             createdAt: new Date().toISOString()
           }));

           // Create PR_CREATED or EMERGENCY_PROCUREMENT movement record for each shortage item
           for (const prItem of prItems) {
             const mrItem = mr.items.find(i => i.productId === prItem.productId);
             const prMovRef = doc(collection(db, 'stockMovements'));
             batch.set(prMovRef, cleanObject({
               id: prMovRef.id,
               productId: prItem.productId,
               productName: mrItem?.productName || 'Unknown Product',
               sku: 'N/A',
               projectId: mr.projectId,
               projectName: mr.projectName,
               type: isEmergency ? MovementType.EMERGENCY_PROCUREMENT : MovementType.PR_CREATED,
               quantity: prItem.quantity,
               currentStock: 0,
               userName: profile?.name || 'System',
               userId: profile?.uid || 'system',
               referenceId: prRef.id,
               referenceType: 'PURCHASE_REQUISITION',
               remarks: `Auto-generated PR for MR ${mr.mrNumber} due to stock shortage`,
               createdAt: new Date().toISOString()
             }));
           }

           const prAuditRef = doc(collection(db, 'auditLogs'));
           batch.set(prAuditRef, {
             action: 'PR_CREATED',
             entityType: 'purchaseRequisitions',
             entityId: prRef.id,
             details: `Auto-generated PR for MR ${mr.mrNumber} due to stock shortage`,
             performedBy: profile?.uid || 'system',
             userName: profile?.name || 'System',
             createdAt: new Date().toISOString()
           });

           // Create audit log for procurement: PARTIAL_PROCUREMENT_CREATED or FULL_PROCUREMENT_CREATED
           if (partialCount > 0) {
             const auditPartialRef = doc(collection(db, 'auditLogs'));
             batch.set(auditPartialRef, {
               action: 'PARTIAL_PROCUREMENT_CREATED',
               entityType: 'materialRequirements',
               entityId: mr.id,
               details: `PR auto-generated with Partial Procurement status: ${partialCount} items required partial buying for MR ${mr.mrNumber}.`,
               performedBy: profile?.uid || 'system',
               userName: profile?.name || 'System',
               createdAt: new Date().toISOString()
             });
           } else if (fullProcurementCount > 0) {
             const auditFullRef = doc(collection(db, 'auditLogs'));
             batch.set(auditFullRef, {
               action: 'FULL_PROCUREMENT_CREATED',
               entityType: 'materialRequirements',
               entityId: mr.id,
               details: `PR auto-generated with Full Procurement status: ${fullProcurementCount} items required full buying for MR ${mr.mrNumber}.`,
               performedBy: profile?.uid || 'system',
               userName: profile?.name || 'System',
               createdAt: new Date().toISOString()
             });
           }
        }

        // Create audit log for WAREHOUSE_RESERVATION_CREATED if any item reserved stock
        if (reservedAnyCount > 0) {
          const auditReservationRef = doc(collection(db, 'auditLogs'));
          batch.set(auditReservationRef, {
            action: 'WAREHOUSE_RESERVATION_CREATED',
            entityType: 'materialRequirements',
            entityId: mr.id,
            details: `Successfully reserved ${reservedAnyCount} items from Main Warehouse stock for MR ${mr.mrNumber}.`,
            performedBy: profile?.uid || 'system',
            userName: profile?.name || 'System',
            createdAt: new Date().toISOString()
          });
        }

        await batch.commit();
      } else if (status === 'REJECTED' && mr.items?.length > 0) {
        // Create MR_REJECTED movement record for each rejected item (Immutable, Timestamped, User Tracked, Project Linked, Material Linked)
        const rejectionPromises = mr.items.map(item => {
          return addDoc(collection(db, 'stockMovements'), cleanObject({
            productId: item.productId,
            productName: item.productName || 'Unknown Product',
            sku: 'N/A',
            projectId: mr.projectId,
            projectName: mr.projectName,
            type: MovementType.MR_REJECTED,
            quantity: item.quantityRequested,
            currentStock: item.quantityAvailable || 0,
            userName: profile?.name || 'Guest User',
            userId: profile?.uid || 'guest',
            referenceId: mr.id,
            referenceType: 'MATERIAL_REQUIREMENT',
            referenceNumber: mr.mrNumber,
            remarks: adminRemarks || `Rejected by ${profile?.name}`,
            createdAt: new Date().toISOString()
          }));
        });
        await Promise.all(rejectionPromises);
      }
      
      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: `MR_${status}`,
        entityType: 'materialRequirements',
        entityId: id,
        details: `Material Requirement ${mr.mrNumber} was ${status.toLowerCase()} by ${profile?.name}`,
        performedBy: profile?.uid || 'guest',
        userName: profile?.name || 'Guest User',
        createdAt: new Date().toISOString()
      });

      // Notification to Requester
      if (mr.requesterId) {
         await addDoc(collection(db, 'notifications'), {
           userId: mr.requesterId,
           title: `Material Requirement ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
           message: `Your MR ${mr.mrNumber} for ${mr.projectName} has been ${status.toLowerCase()}.`,
           read: false,
           createdAt: new Date().toISOString()
         });
      }

      setMr({ ...mr, ...updateData });
      toast.success(`Material Requirement successfully ${status.toLowerCase()}`);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to process action');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center font-bold text-slate-500">Loading details...</div>;
  }

  if (!mr) {
    return <div className="p-10 text-center font-bold text-slate-500">Material Requirement not found.</div>;
  }

  const isFulfillable = mr.fulfillmentStatus === 'FULFILLABLE' || mr.status === 'FULFILLABLE'; // fallback for old data
  const isAdmin = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROJECT_MANAGER;
  const canAct = mr.status === 'PENDING' && isAdmin;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl bg-white border border-slate-200" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <div className="flex-1 flex justify-between items-center pr-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">Requirement Details</h1>
            <span className={`inline-flex px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded-md border ${
              mr.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
              mr.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {mr.status}
            </span>
          </div>
          {canAct && (
            <div className="flex gap-2">
               <Button onClick={() => handleActionClick('REJECT')} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 font-bold px-4 gap-2">
                 <X className="w-4 h-4" /> Reject
               </Button>
               <Button onClick={() => handleActionClick('APPROVE')} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 gap-2">
                 <Check className="w-4 h-4" /> Approve
               </Button>
            </div>
          )}
        </div>
      </div>
      <p className="text-slate-500 font-mono text-sm tracking-widest mt-1 ml-14">ID: {mr.mrNumber}</p>

      {mr.approvalRemarks && (
        <div className={`p-4 rounded-xl border ${mr.status === 'APPROVED' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
           <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Admin Remarks / {mr.status}</h3>
           <p className="text-sm font-medium text-slate-800">{mr.approvalRemarks}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Origin Information</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-600">
              <Building className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-sm">Target Project</span>
            </div>
            <span className="font-bold text-slate-900">{getProjectDisplayName(mr.projectId, { name: mr.projectName })}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-sm">Requested By</span>
            </div>
            <span className="font-bold text-slate-900">{mr.requesterName || 'Admin'}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-sm">Raised On</span>
            </div>
            <span className="font-medium text-slate-900 text-sm">{format(new Date(mr.createdAt), 'dd MMM yyyy, HH:mm')}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Status Overview</h3>
          
          <div className="flex items-start gap-4">
             {isFulfillable ? (
               <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                 <CheckCircle2 className="w-6 h-6 text-green-600" />
               </div>
             ) : (
               <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                 <AlertTriangle className="w-6 h-6 text-amber-600" />
               </div>
             )}
             <div>
               <h4 className="font-bold text-slate-900 mb-1">
                 {isFulfillable ? 'Stock is Fulfillable' : 'Initial Stock Shortage Detected'}
               </h4>
               <p className="text-sm text-slate-500 font-medium">
                 {isFulfillable 
                   ? 'All items requested are currently available in the main warehouse. You can safely proceed with material requisition or stock transfer.'
                   : 'Some items do not have sufficient stock in the main warehouse. You may need to raise a Purchase Requisition for the remaining balance.'}
               </p>
             </div>
          </div>
          
          {mr.remarks && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-xs uppercase tracking-widest">Remarks</span>
              </div>
              <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{mr.remarks}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800">Requested Items Breakdown</h2>
          <span className="text-xs font-mono text-slate-400">Fulfillment Engine Active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-100 text-slate-500 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4 text-center">Required Quantity</th>
                <th className="px-6 py-4 text-center">Warehouse Stock</th>
                <th className="px-6 py-4 text-center">Warehouse Fulfillment</th>
                <th className="px-6 py-4 text-center">Procurement Quantity</th>
                <th className="px-6 py-4 text-right">Fulfillment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mr.items?.map((item, idx) => {
                const whStock = item.warehouseStock !== undefined ? item.warehouseStock : (item.quantityAvailable || 0);
                const fulfillment = item.warehouseFulfillmentQuantity !== undefined ? item.warehouseFulfillmentQuantity : Math.min(whStock, item.quantityRequested);
                const procurement = item.procurementQuantity !== undefined ? item.procurementQuantity : (item.shortage || 0);
                const fulfillmentType = item.fulfillmentType || (procurement === 0 ? 'FULL_WAREHOUSE' : (fulfillment > 0 ? 'PARTIAL_PROCUREMENT' : 'FULL_PROCUREMENT'));

                let statusText = 'Full Warehouse';
                let statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (fulfillmentType === 'PARTIAL_PROCUREMENT') {
                  statusText = 'Partial Procurement';
                  statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
                } else if (fulfillmentType === 'FULL_PROCUREMENT') {
                  statusText = 'Full Procurement';
                  statusBg = 'bg-rose-50 text-rose-700 border-rose-200';
                }

                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{formatMaterialName(item.productName)}</div>
                      <div className="text-xs font-mono text-slate-400 mt-1">{item.productId}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        {item.quantityRequested}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-medium text-slate-600">
                      {whStock}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-teal-600">
                      {fulfillment}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-mono font-bold px-2.5 py-1 rounded-md ${procurement > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-400'}`}>
                        {procurement}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${statusBg}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-sans">
              {actionType === 'APPROVE' ? 'Approve Requirement' : 'Reject Requirement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">
                Admin Remarks {actionType === 'REJECT' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className="w-full bg-white border border-slate-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                placeholder={actionType === 'APPROVE' ? "Optional remarks..." : "Please provide a reason for rejection..."}
                rows={4}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold border-slate-200">
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={processing}
              className={`rounded-xl font-bold text-white ${
                actionType === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processing ? 'Processing...' : actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
