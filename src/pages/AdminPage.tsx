import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc, query, orderBy, getDocs, onSnapshot, where } from 'firebase/firestore';
import { UserRole } from '@/types';
import { Shield, Search, Mail, Building, Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';

interface DemoRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phoneNumber: string;
  companySize: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Only admins should see this, but it's protected by rules anyway.
    if (profile?.role !== UserRole.ADMIN) return;

    const q = query(collection(db, 'demoRequests'), orderBy('createdAt', 'desc'));
    
    // Realtime listen to demo requests
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: DemoRequest[] = [];
      snapshot.forEach(doc => {
        requests.push({ id: doc.id, ...doc.data() } as DemoRequest);
      });
      setDemoRequests(requests);
    }, (error) => {
      console.error("Error fetching demo requests:", error);
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredRequests = demoRequests.filter(req => {
    const q = searchQuery.toLowerCase();
    return (
      req.firstName?.toLowerCase().includes(q) ||
      req.lastName?.toLowerCase().includes(q) ||
      req.email?.toLowerCase().includes(q) ||
      req.status?.toLowerCase().includes(q)
    );
  });

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
        const q = query(collection(db, 'products'), where('sku', '==', p.sku), orderBy('sku'));
        const existing = await getDocs(q);
        
        if (existing.empty) {
          const docRef = await addDoc(collection(db, 'products'), p);
          productIds.push(docRef.id);
        } else {
          productIds.push(existing.docs[0].id);
        }
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
      }, { merge: true });

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

      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Demo Requests</h2>
            <p className="text-sm text-slate-500">Manage incoming requests from the landing page.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search requests..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Company Size</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Requested On</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 py-10">
                    No demo requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{req.firstName} {req.lastName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700 font-sans">{req.companyName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center text-slate-600 gap-1.5 text-xs">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {req.email}
                        </div>
                        {req.phoneNumber && (
                           <div className="flex items-center text-slate-500 gap-1.5 text-xs">
                             <Phone className="w-3.5 h-3.5 text-slate-400" />
                             {req.phoneNumber}
                           </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                        <Building className="w-3.5 h-3.5" />
                        {req.companySize || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                        req.status === 'Pending' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : req.status === 'Contacted' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {req.createdAt ? format(new Date(req.createdAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          const newStatus = req.status === 'Pending' ? 'Contacted' : req.status === 'Contacted' ? 'Converted' : 'Pending';
                          try {
                            await updateDoc(doc(db, 'demoRequests', req.id), { status: newStatus });
                            
                            // Audit log
                            await addDoc(collection(db, 'auditLogs'), {
                              action: 'UPDATE_DEMO_REQUEST_STATUS',
                              entityId: req.id,
                              entityType: 'demoRequests',
                              details: `Status changed from ${req.status} to ${newStatus}`,
                              performedBy: user?.uid || 'unknown',
                              performedAt: new Date().toISOString()
                            });

                            toast.success(`Status updated to ${newStatus}`);
                          } catch(err) {
                            toast.error('Failed to update status');
                          }
                        }}
                      >
                        Change Status
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
