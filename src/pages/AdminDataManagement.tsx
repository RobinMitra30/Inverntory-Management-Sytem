import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/types';
import { Trash2, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const COLLECTIONS = [
  { id: 'purchaseRequisitions', name: 'Purchase Requisitions' },
  { id: 'purchaseOrders', name: 'Purchase Orders' },
  { id: 'grns', name: 'GRNs' },
  { id: 'projectReturns', name: 'Project Returns' },
  { id: 'returnsToStore', name: 'Returns to Store' },
  { id: 'returnsToVendor', name: 'Returns to Vendor' },
  { id: 'stockMovements', name: 'Stock Movements' },
  { id: 'stocks', name: 'Stock Inventory (Main & Project)' },
];

export default function AdminDataManagement() {
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [action, setAction] = useState<{ type: 'DELETE_ALL' | 'RESET', target?: string } | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (profile?.role !== UserRole.ADMIN) {
    return <Navigate to="/" />;
  }

  const handleAction = async () => {
    if (!action) return;
    const requiredPhrase = (action.type === 'DELETE_ALL' ? 'DELETE' : 'RESET');
    if (confirmationInput !== requiredPhrase) {
      toast.error('Invalid confirmation phrase');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      if (action.type === 'DELETE_ALL' && action.target) {
        const querySnapshot = await getDocs(collection(db, action.target));
        const docs = querySnapshot.docs;
        
        if (docs.length > 0) {
          for (let i = 0; i < docs.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = docs.slice(i, i + 500);
            chunk.forEach(docSnap => batch.delete(doc(db, action.target!, docSnap.id)));
            await batch.commit();
          }
        }
        
        await addDoc(collection(db, 'auditLogs'), {
          adminName: profile?.name,
          adminEmail: profile?.email,
          action: 'MANUAL_DELETE_ALL',
          module: action.target,
          recordsDeleted: querySnapshot.size,
          timestamp: Timestamp.now(),
        });
        
        toast.success(`Successfully deleted all records in ${action.target}`);
      } else if (action.type === 'RESET') {
        const affectedCollections = COLLECTIONS.map(c => c.id);
        let totalDeleted = 0;

        for (const colId of affectedCollections) {
          const querySnapshot = await getDocs(collection(db, colId));
          const docs = querySnapshot.docs;
          totalDeleted += docs.length;
          
          if (docs.length === 0) continue;

          // Process in batches of 500 (Firestore Batch limit)
          for (let i = 0; i < docs.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = docs.slice(i, i + 500);
            chunk.forEach(docSnap => batch.delete(doc(db, colId, docSnap.id)));
            await batch.commit();
          }
        }

        await addDoc(collection(db, 'auditLogs'), {
          adminName: profile?.name,
          adminEmail: profile?.email,
          action: 'FULL_SYSTEM_RESET',
          module: 'ALL_TRANSACTIONS_AND_STOCKS',
          recordsDeleted: totalDeleted,
          timestamp: Timestamp.now(),
        });
        
        toast.success('System reset successful: All transaction history and inventory cleared.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to perform action. Check permissions.');
    } finally {
      setLoading(false);
      setIsDialogOpen(false);
      setConfirmationInput('');
      setAction(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Data Management</h1>
        <p className="text-slate-500 mt-1 font-medium">Clear transactional history and reset inventory quantities for maintenance.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COLLECTIONS.map((col) => (
          <div key={col.id} className="p-5 border border-slate-200 rounded-2xl flex flex-col justify-between bg-white shadow-sm hover:shadow-md transition-shadow">
            <div>
              <span className="font-bold text-slate-900 block truncate">{col.name}</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">Collection: {col.id}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 rounded-xl border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 h-9"
              onClick={() => { setAction({ type: 'DELETE_ALL', target: col.id }); setIsDialogOpen(true); }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete All Data
            </Button>
          </div>
        ))}
      </div>

      <div className="p-8 border-2 border-dashed border-red-200 bg-red-50/50 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-xl font-black text-red-900 flex items-center gap-2 justify-center md:justify-start uppercase">
            <RefreshCw className="w-5 h-5" /> Master System Reset
          </h2>
          <p className="text-sm text-red-700 font-medium max-w-md">
            This will wipe ALL transactional data (PRs, POs, GRNs, Returns, Movements) and reset ALL stock quantities to zero. 
            <span className="block mt-1 font-bold">Products, Users, Vendors, and Projects will NOT be affected.</span>
          </p>
        </div>
        <Button 
          variant="destructive" 
          size="lg"
          className="rounded-2xl px-8 h-14 font-black shadow-lg shadow-red-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
          onClick={() => { setAction({ type: 'RESET' }); setIsDialogOpen(true); }}
        >
          Reset All Data
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black italic text-red-600 uppercase tracking-tight">
              <AlertTriangle className="w-8 h-8" /> Critical Warning
            </DialogTitle>
            <DialogDescription className="text-slate-600 font-medium py-2">
              This operation is final. You are about to permanently delete records from the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
              <p className="text-xs font-bold text-orange-900 uppercase tracking-widest mb-1">Confirmation Required</p>
              <p className="text-sm text-orange-800 italic">
                Please type <span className="font-mono font-black underline decoration-2">{action?.type === 'DELETE_ALL' ? 'DELETE' : 'RESET'}</span> below to authorize this action.
              </p>
            </div>
            
            <Input 
              value={confirmationInput} 
              onChange={(e) => setConfirmationInput(e.target.value)} 
              placeholder="Authorization phrase..." 
              className="h-12 rounded-xl border-slate-200 font-bold tracking-widest focus-visible:ring-red-500"
            />
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleAction} 
              disabled={loading || confirmationInput !== (action?.type === 'DELETE_ALL' ? 'DELETE' : 'RESET')}
              className="rounded-xl font-black uppercase tracking-widest h-12 px-8 shadow-lg shadow-red-100"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
              Execute Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
