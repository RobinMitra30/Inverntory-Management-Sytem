import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, Search, Building } from 'lucide-react';
import { format } from 'date-fns';
import { MaterialRequirement, MRLineItem, Project, Product, Stock, MAIN_WAREHOUSE_PROJECT_ID, MovementType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatMaterialName } from '@/lib/utils';
import { MaterialSelector } from '@/components/MaterialSelector';

export default function MaterialRequirementsPage() {
  const { profile } = useAuth();
  const [reqs, setReqs] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Form State
  const [selectedProject, setSelectedProject] = useState('');
  const [mrItems, setMrItems] = useState<{ productId: string; qty: string }[]>([{ productId: '', qty: '' }]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getProjectDisplayName = (projectId: string, proj?: Project): string => {
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
    const q = query(collection(db, 'materialRequirements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: MaterialRequirement[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as MaterialRequirement);
      });
      setReqs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [warehouseStocks, setWarehouseStocks] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isFormOpen) {
      // Fetch projects
      const fetchProjects = async () => {
        const querySnapshot = await getDocs(collection(db, 'projects'));
        const prjs: Project[] = [];
        querySnapshot.forEach((doc) => prjs.push({ id: doc.id, ...doc.data() } as Project));
        setProjects(prjs.filter(p => p.id !== MAIN_WAREHOUSE_PROJECT_ID));
      };
      // Fetch products
      const fetchProducts = async () => {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const prods: Product[] = [];
        querySnapshot.forEach((doc) => prods.push({ id: doc.id, ...doc.data() } as Product));
        setProducts(prods);
      };
      // Subscribe to warehouse stocks
      const qStocks = query(collection(db, 'stocks'), where('projectId', '==', MAIN_WAREHOUSE_PROJECT_ID));
      const unsubscribeStocks = onSnapshot(qStocks, (snapshot) => {
        const stockMap: Record<string, number> = {};
        snapshot.forEach((doc) => {
          const item = doc.data() as Stock;
          stockMap[item.productId] = item.quantity || 0;
        });
        setWarehouseStocks(stockMap);
      });
      fetchProjects();
      fetchProducts();
      return () => {
        unsubscribeStocks();
      };
    }
  }, [isFormOpen]);

  const handleAddItem = () => setMrItems([...mrItems, { productId: '', qty: '' }]);
  
  const handleRemoveItem = (index: number) => {
    setMrItems(mrItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'qty', value: string) => {
    const newItems = [...mrItems];
    newItems[index][field] = value;
    setMrItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return toast.error('Please select a project');
    
    const validItems = mrItems.filter(i => i.productId && Number(i.qty) > 0);
    if (validItems.length === 0) return toast.error('Please add at least one valid item');

    setSubmitting(true);
    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) throw new Error('Project not found');

      // Fetch warehouse stock to calculate shortage
      const productIds = validItems.map(i => i.productId);
      const stockQuery = query(
        collection(db, 'stocks'),
        where('projectId', '==', MAIN_WAREHOUSE_PROJECT_ID),
        where('productId', 'in', productIds)
      );
      const stockSnap = await getDocs(stockQuery);
      const warehouseStock: Record<string, number> = {};
      stockSnap.forEach((doc) => {
        const stock = doc.data() as Stock;
        warehouseStock[stock.productId] = stock.quantity;
      });

      let hasShortage = false;
      const finalItems: MRLineItem[] = validItems.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const requested = Number(item.qty);
        const whStock = warehouseStock[item.productId] || 0;
        const fulfillment = Math.min(whStock, requested);
        const procurement = Math.max(0, requested - whStock);
        
        let localFulfillmentType: 'FULL_WAREHOUSE' | 'PARTIAL_PROCUREMENT' | 'FULL_PROCUREMENT' = 'FULL_WAREHOUSE';
        if (fulfillment === 0) {
          localFulfillmentType = 'FULL_PROCUREMENT';
        } else if (procurement > 0) {
          localFulfillmentType = 'PARTIAL_PROCUREMENT';
        }

        if (procurement > 0) hasShortage = true;

        return {
          productId: item.productId,
          productName: prod?.name || 'Unknown Product',
          quantityRequested: requested,
          quantityAvailable: whStock,
          shortage: procurement,
          warehouseStock: whStock,
          warehouseFulfillmentQuantity: fulfillment,
          procurementQuantity: procurement,
          fulfillmentType: localFulfillmentType
        };
      });

      // Status logic
      let fulfillmentStatus = 'FULFILLABLE';
      if (hasShortage) {
        const hasSomeWarehouseStockMatched = finalItems.some(item => (item.warehouseFulfillmentQuantity || 0) > 0);
        if (hasSomeWarehouseStockMatched) {
          fulfillmentStatus = 'PARTIAL';
        } else {
          fulfillmentStatus = 'SHORTAGE';
        }
      }

      // Generate MR Number
      const mrNumber = `MR-${Math.floor(100000 + Math.random() * 900000)}`;

      const newMr = {
        mrNumber,
        projectId: selectedProject,
        projectName: project.name,
        requesterId: profile?.uid || 'guest',
        requesterName: profile?.name || 'Guest User',
        status: 'PENDING',
        fulfillmentStatus,
        items: finalItems,
        remarks,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'materialRequirements'), newMr);

      // Stock Movement Ledger Insertion (Immutable, Timestamped, User Tracked, Project Linked, Material Linked)
      const movementPromises = finalItems.map(item => {
        return addDoc(collection(db, 'stockMovements'), {
          productId: item.productId,
          productName: item.productName,
          sku: products.find(p => p.id === item.productId)?.sku || 'N/A',
          projectId: selectedProject,
          projectName: project.name,
          type: MovementType.MATERIAL_REQUEST,
          quantity: item.quantityRequested,
          currentStock: item.warehouseStock || 0,
          userName: profile?.name || 'Guest User',
          userId: profile?.uid || 'guest',
          referenceId: docRef.id,
          referenceType: 'MATERIAL_REQUIREMENT',
          referenceNumber: mrNumber,
          remarks: `Material Request raised: ${remarks || 'No remarks'}`,
          createdAt: new Date().toISOString()
        });
      });
      await Promise.all(movementPromises);

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'CREATED',
        entityType: 'materialRequirements',
        entityId: docRef.id,
        details: `Material Requirement ${mrNumber} raised for ${project.name}`,
        performedBy: profile?.uid || 'guest',
        userName: profile?.name || 'Guest User',
        createdAt: new Date().toISOString()
      });

      // Log: WAREHOUSE_FULFILLMENT_CALCULATED
      await addDoc(collection(db, 'auditLogs'), {
        action: 'WAREHOUSE_FULFILLMENT_CALCULATED',
        entityType: 'materialRequirements',
        entityId: docRef.id,
        details: `Fulfillment calculated for ${mrNumber}: Warehouse Stock, fulfillment quantities, and procurement quantities mapped.`,
        performedBy: profile?.uid || 'guest',
        userName: profile?.name || 'Guest User',
        createdAt: new Date().toISOString()
      });

      toast.success('Material Requirement raised successfully');
      setIsFormOpen(false);
      
      // Reset form
      setSelectedProject('');
      setMrItems([{ productId: '', qty: '' }]);
      setRemarks('');
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to raise MR');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReqs = reqs.filter(r => 
    r.mrNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-teal-600" />
            Material Requirements
          </h1>
          <p className="text-slate-500 text-sm font-medium">Manage project material requirements and check availability</p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-4 rounded-xl shadow-md gap-2 inline-flex items-center">
            <Plus className="w-4 h-4" /> Raise Requirement
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-sans">Raise Material Requirement (MR)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Target Project</label>
                  <select 
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-3 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    required
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{getProjectDisplayName(p.id, p)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 block mb-1">Items Requested</label>
                  {mrItems.map((item, idx) => (
                    <div key={idx} className="space-y-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="flex gap-2 items-center">
                        <MaterialSelector 
                          products={products}
                          selectedProductId={item.productId}
                          onSelect={(v) => handleItemChange(idx, 'productId', v)}
                          warehouseStocks={warehouseStocks}
                          className="flex-1 h-12 bg-white rounded-xl border border-slate-200 font-medium text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <Input 
                          type="number"
                          placeholder="Qty"
                          className="w-32 h-12 bg-white font-mono font-medium text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          required
                          min="1"
                        />
                        {mrItems.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl shrink-0 p-0"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            X
                          </Button>
                        )}
                      </div>
                      {item.productId && (
                        (() => {
                          const whStock = warehouseStocks[item.productId] || 0;
                          const requested = Number(item.qty) || 0;
                          const fulfillment = Math.min(whStock, requested);
                          const procurement = Math.max(0, requested - whStock);
                          
                          let statusText = 'Full Warehouse Fulfillment';
                          let statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                          if (requested > 0) {
                            if (fulfillment === 0) {
                              statusText = 'Full Procurement Required';
                              statusBg = 'bg-rose-50 text-rose-700 border-rose-100';
                            } else if (procurement > 0) {
                              statusText = 'Partial Fulfillment Required';
                              statusBg = 'bg-amber-50 text-amber-700 border-amber-100';
                            }
                          } else {
                            statusText = 'Enter Quantity';
                            statusBg = 'bg-slate-50 text-slate-500 border-slate-100';
                          }

                          return (
                            <div className="mt-3 bg-white p-4 rounded-xl border border-teal-100 shadow-xs">
                              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5" /> 
                                Warehouse Availability Status
                              </h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                                    <span className="text-slate-500 font-medium">Warehouse Stock</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{whStock}</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                                    <span className="text-slate-500 font-medium">Requested Quantity</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{requested}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-emerald-50/50 border border-emerald-100/60 px-3 py-2 rounded-lg">
                                    <span className="text-emerald-700 font-medium">Warehouse Fulfillment</span>
                                    <span className="font-mono font-bold text-emerald-600 text-sm">{fulfillment}</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-amber-50/50 border border-amber-100/60 px-3 py-2 rounded-lg">
                                    <span className="text-amber-700 font-medium">Need Procurement</span>
                                    <span className="font-mono font-bold text-amber-600 text-sm">{procurement}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest font-mono">Fulfillment Summary</span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-bold shadow-2xs ${statusBg}`}>
                                  {statusText}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddItem}
                    className="mt-2 text-teal-600 font-bold border-teal-200 hover:bg-teal-50 h-10"
                  >
                    + Add Another Item
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Remarks</label>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Any specific instructions or urgency notes..."
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">
                  {submitting ? 'Processing...' : 'Submit MR'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input 
              placeholder="Search MR number or project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-6 py-4">MR Number</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Requester</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Fulfillment</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">Loading records...</td>
                </tr>
              ) : filteredReqs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">No material requirements found.</td>
                </tr>
              ) : (
                filteredReqs.map(mr => (
                  <tr key={mr.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{mr.mrNumber}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-2">
                       <Building className="w-3.5 h-3.5 text-slate-400" />
                       {getProjectDisplayName(mr.projectId, { name: mr.projectName } as any)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {format(new Date(mr.createdAt), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {mr.requesterName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md border ${
                        mr.status === 'APPROVED' 
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : mr.status === 'REJECTED'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : mr.status === 'PENDING'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {mr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md border ${
                        mr.fulfillmentStatus === 'FULFILLABLE' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : mr.fulfillmentStatus === 'SHORTAGE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {mr.fulfillmentStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/material-requirements/${mr.id}`}>
                        <Button variant="outline" size="sm" className="font-bold border-slate-200 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </Link>
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
