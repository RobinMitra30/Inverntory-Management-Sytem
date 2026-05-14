import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { UserRole } from '@/types';
import { Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function AdminPage() {
  const { user, profile } = useAuth();

  const elevateToAdmin = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: UserRole.ADMIN
      });
      toast.success('Your account has been elevated to ADMIN. Please refresh the page.');
    } catch (err) {
      console.error(err);
      toast.error('Elevation failed');
    }
  };

  const seedData = async () => {
    try {
      const project1 = await addDoc(collection(db, 'projects'), {
        name: 'Grand Horizon Mall',
        location: 'Mumbai, MH',
        status: 'ACTIVE',
        budget: 50000000,
        createdAt: new Date().toISOString()
      });

      const products = [
        { sku: 'CEM-OPC-53', name: 'OPC Cement 53 Grade', category: 'Cement', uom: 'Bags', lowStockThreshold: 100, unitPrice: 450 },
        { sku: 'STL-TMT-12', name: 'TMT Steel 12mm', category: 'Steel', uom: 'MT', lowStockThreshold: 5, unitPrice: 65000 },
        { sku: 'BRK-RED-STD', name: 'Standard Red Bricks', category: 'Bricks', uom: 'Pcs', lowStockThreshold: 1000, unitPrice: 8 },
      ];

      const productIds: string[] = [];
      for (const p of products) {
        const docRef = await addDoc(collection(db, 'products'), p);
        productIds.push(docRef.id);
      }

      const vendorRef = await addDoc(collection(db, 'vendors'), {
        name: 'UltraTech Supplies',
        email: 'sales@ultratech.com',
        status: 'ACTIVE',
        category: 'Cement'
      });

      await setDoc(doc(db, 'purchaseOrders', 'SAMPLE-PO-001'), {
        vendorId: vendorRef.id,
        projectId: project1.id,
        status: 'PENDING',
        items: [
          { productId: productIds[0], quantityOrdered: 500, quantityReceived: 0, unitPrice: 450 },
          { productId: productIds[1], quantityOrdered: 10, quantityReceived: 0, unitPrice: 65000 }
        ],
        createdAt: new Date().toISOString(),
        totalAmount: 500 * 450 + 10 * 65000
      });

      toast.success('System seeded with sample projects, products, and POs');
    } catch (err) {
      console.error(err);
      toast.error('Seeding failed');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Administrative Control</h1>
        <p className="text-slate-500 text-sm">System configuration and maintenance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 border border-slate-200 rounded-sm space-y-4">
          <h2 className="text-lg font-bold italic">Development Tools</h2>
          <p className="text-sm text-slate-500">Populate the database with sample construction data to test workflows.</p>
          <div className="flex gap-2">
            <Button onClick={elevateToAdmin} variant="outline" className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 gap-2">
              <Shield className="w-4 h-4" /> Elevate to Admin
            </Button>
            <Button onClick={seedData} variant="outline" className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50">
              Seed Demo Data
            </Button>
          </div>
        </div>

        <div className="bg-white p-8 border border-slate-200 rounded-sm space-y-4">
          <h2 className="text-lg font-bold italic">System Health</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase">Database Status</span>
              <span className="text-green-600 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Operational
              </span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase">Auth Mode</span>
              <span className="text-slate-900 font-bold">FIREBASE_OAUTH</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
