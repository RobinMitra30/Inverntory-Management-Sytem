import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { ProjectService } from '@/services/store';
import { Project } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function DataSeeder({ currentProjectId }: { currentProjectId?: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<string>('Idle');
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const unsub = ProjectService.subscribe((data) => {
        setProjects(data);
        setStatus(`Loaded ${data.length} projects`);
    });
    return unsub;
  }, [user]);

  const materials = [
    { name: "Cement", category: "Basics", unit: "Bags" },
    { name: "Sand", category: "Basics", unit: "Trolley" },
    { name: "Aggregate", category: "Basics", unit: "Trolley" },
    { name: "Steel Rod", category: "Structural", unit: "KG" },
    { name: "TMT Bar", category: "Structural", unit: "KG" },
    { name: "Bricks", category: "Basics", unit: "Nos" },
    { name: "Tiles", category: "Finishing", unit: "Boxes" },
    { name: "Granite", category: "Finishing", unit: "SqFt" },
    { name: "Marble", category: "Finishing", unit: "SqFt" },
    { name: "Putty", category: "Finishing", unit: "Bags" },
    { name: "Paint", category: "Finishing", unit: "Ltr" },
    { name: "Primer", category: "Finishing", unit: "Ltr" },
    { name: "Electrical Wire", category: "Electrical", unit: "Meter" },
    { name: "PVC Pipe", category: "Plumbing", unit: "Nos" },
    { name: "Water Tank", category: "Plumbing", unit: "Nos" },
    { name: "Door Frame", category: "Interior", unit: "Nos" },
    { name: "Window Frame", category: "Interior", unit: "Nos" },
    { name: "Plywood", category: "Interior", unit: "Sheet" },
    { name: "Glass Sheet", category: "Interior", unit: "SqFt" },
    { name: "Quartz Slab", category: "Finishing", unit: "Nos" },
    { name: "Tile Adhesive", category: "Finishing", unit: "Bags" },
    { name: "POP", category: "Finishing", unit: "Bags" },
    { name: "Switch Board", category: "Electrical", unit: "Nos" },
    { name: "LED Light", category: "Electrical", unit: "Nos" },
    { name: "Plumbing Pipe", category: "Plumbing", unit: "Meter" },
    { name: "Bathroom Fittings", category: "Plumbing", unit: "Set" },
    { name: "Fasteners", category: "Hardware", unit: "Nos" },
    { name: "Hardware Items", category: "Hardware", unit: "Nos" },
    { name: "Safety Equipment", category: "Safety", unit: "Set" },
    { name: "Wooden Panels", category: "Interior", unit: "Sheet" }
  ];

  const seedData = async () => {
    setIsConfirmationOpen(false);
    setStatus('Seeding...');
    try {
        let projectId = currentProjectId;
        
        if (!projectId) {
            const demoProjects = projects.filter(p => p.isDemo);
            
            if (demoProjects.length < 2) {
                toast.info('Creating Demo Projects...');
                setStatus('Creating Demo Projects...');
                
                // Project 1
                if (!projects.find(p => p.name === 'XYZ Project')) {
                  await ProjectService.add({
                    name: 'XYZ Project',
                    location: 'Downtown Construction Site',
                    status: 'ACTIVE',
                    managerId: user?.uid || 'admin',
                    budget: 1200000,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    isDemo: true,
                    createdAt: new Date().toISOString()
                  });
                }

                // Project 2
                if (!projects.find(p => p.name === 'Modern Office Complex')) {
                  projectId = await ProjectService.add({
                    name: 'Modern Office Complex',
                    location: 'Business Park, North Wing',
                    status: 'ACTIVE',
                    managerId: user?.uid || 'admin',
                    budget: 2500000,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    isDemo: true,
                    createdAt: new Date().toISOString()
                  });
                }
                
                if (!projectId) {
                  // Fallback to first demo project if second wasn't needed or failed
                  const updatedProjects = await new Promise<Project[]>((resolve) => {
                    ProjectService.subscribe(data => resolve(data));
                  });
                  projectId = updatedProjects.find(p => p.isDemo)?.id;
                }
            } else {
              projectId = demoProjects[0].id;
            }
        }

        setStatus('Seeding Materials (Batch)...');
        toast.info('Adding dummy data to inventory...');

        const batch = writeBatch(db);

        const vendors = ['V1', 'V2', 'V3'];
        const now = new Date();

        for (const mat of materials) {
            // 1. Product
            const productRef = doc(collection(db, 'products'));
            batch.set(productRef, {
                name: mat.name,
                category: mat.category,
                uom: mat.unit,
                sku: `SKU-${mat.name.substring(0,3).toUpperCase()}-${Math.floor(Math.random()*1000)}`,
                lowStockThreshold: 10,
                description: `High quality ${mat.name}`,
                unitPrice: Math.floor(Math.random() * 1000) + 10,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Let's create some history over the last 6 months
            let currentStockQty = 0;
            const numTransactions = Math.floor(Math.random() * 5) + 3; // 3 to 7 transactions per product

            for (let i = 0; i < numTransactions; i++) {
                // Random date within the last 180 days
                const daysAgo = Math.floor(Math.random() * 180);
                const txDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
                
                // 50% chance of IN, 50% chance of OUT (only if stock > 0)
                const isOut = currentStockQty > 20 && Math.random() > 0.5;
                const type = isOut ? 'OUT' : 'IN';
                const qty = isOut ? Math.floor(Math.random() * 20) + 5 : Math.floor(Math.random() * 100) + 20;

                if (type === 'IN') {
                    currentStockQty += qty;
                    // Also create a PO for 'IN' to feed reports
                    const poRef = doc(collection(db, 'purchaseOrders'));
                    batch.set(poRef, {
                        id: poRef.id,
                        poNumber: `PO-${Math.floor(Math.random() * 10000)}`,
                        vendorId: vendors[Math.floor(Math.random() * vendors.length)],
                        projectId: projectId,
                        status: 'COMPLETED',
                        items: [{
                            productId: productRef.id,
                            quantityOrdered: qty,
                            quantityReceived: qty,
                            unitPrice: 50 // simplistic
                        }],
                        taxPercent: 5,
                        discountAmount: 0,
                        totalAmount: qty * 50 * 1.05,
                        createdAt: txDate.toISOString()
                    });
                } else {
                    currentStockQty -= qty;
                }

                // Movement
                const movementRef = doc(collection(db, 'stockMovements'));
                batch.set(movementRef, {
                    id: movementRef.id,
                    productId: productRef.id,
                    projectId: projectId,
                    type: type,
                    quantity: qty,
                    userId: user?.uid || 'admin',
                    remarks: `Dummy ${type} data`,
                    createdAt: txDate.toISOString()
                });
            }

            // 2. Stock (Final State)
            const stockId = `${projectId}_${productRef.id}`;
            const stockRef = doc(db, 'stocks', stockId);
            batch.set(stockRef, {
                id: stockId,
                productId: productRef.id,
                projectId: projectId,
                quantity: currentStockQty,
                lastUpdated: now.toISOString()
            });
        }
        
        await batch.commit();
        
        toast.success('Seeding triggered successfully.');
        setStatus('Seeding Complete');
    } catch (err) {
      toast.error('Seeding failed');
      setStatus('Error: Seeding failed');
      console.error('Seed error:', err);
    }
  };

    const cleanData = async () => {
        setIsConfirmationOpen(false);
        setStatus('Cleaning...');
        try {
            const collectionsToClean = ['products', 'stocks', 'stockMovements', 'purchaseOrders', 'grns', 'purchaseRequisitions', 'projects'];
            
            for (const collName of collectionsToClean) {
                setStatus(`Cleaning ${collName}...`);
                const collRef = collection(db, collName);
                const querySnapshot = await import('firebase/firestore').then(m => m.getDocs(collRef));
                
                // Batch delete in chunks of 500
                let batch = writeBatch(db);
                let count = 0;
                let promises = [];

                for (let i = 0; i < querySnapshot.docs.length; i++) {
                    const docId = querySnapshot.docs[i].id;
                    // Don't delete admin users etc, but we aren't cleaning users here anyway.
                    batch.delete(doc(db, collName, docId));
                    count++;
                    if (count === 490) {
                        promises.push(batch.commit());
                        batch = writeBatch(db);
                        count = 0;
                    }
                }
                if (count > 0) {
                    promises.push(batch.commit());
                }
                await Promise.all(promises);
            }

            toast.success('Database cleaned successfully.');
            setStatus('Clean Complete');
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error('Clean failed');
            setStatus('Error: Clean failed');
            console.error('Clean error:', err);
        }
    };

  const [isVisible, setIsVisible] = useState(true);
  const [globalDemoMode, setGlobalDemoMode] = useState(() => {
    return localStorage.getItem('erp_demo_mode') !== 'false';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setGlobalDemoMode(localStorage.getItem('erp_demo_mode') !== 'false');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!globalDemoMode) return null;

  return (
    <>
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 z-50">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setIsVisible(!isVisible)}
          className="rounded-full shadow-lg border border-slate-200 bg-white hover:bg-slate-50"
        >
          {isVisible ? 'Hide Tools' : 'Show Mgmt Tools'}
        </Button>
        
        {isVisible && (
          <div className="flex flex-col gap-2 scale-in-center">
            <div className="bg-white p-2 text-[10px] rounded border shadow-sm font-mono">{status}</div>
            <div className="flex gap-2">
                <Button onClick={() => setIsConfirmationOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md h-9 text-xs">
                  Seed XYZ Data
                </Button>
                <Button onClick={cleanData} className="bg-orange-600 hover:bg-orange-700 shadow-md h-9 text-xs">
                  Clean Data
                </Button>
            </div>
          </div>
        )}
    </div>
    
    <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirm Data Seeding</DialogTitle>
                <DialogDescription>
                    Adding 30 dummy materials into the site inventory of {currentProjectId ? 'this Project' : 'XYZ Project'}. This action cannot be undone. Are you sure?
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmationOpen(false)}>Cancel</Button>
                <Button onClick={seedData} className="bg-red-600">Proceed</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
