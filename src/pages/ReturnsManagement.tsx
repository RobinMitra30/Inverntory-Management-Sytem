import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  ClipboardList,
  MapPin,
  Box,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  History,
  Image as ImageIcon
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ReturnToStoreService, 
  ReturnToVendorService, 
  ProductService, 
  ProjectService,
  VendorService,
  InventoryService,
  ProjectReturnService
} from '@/services/store';
import { ReturnToStore, ReturnToVendor, Product, Project, Vendor, Stock, ProjectReturn } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface SearchableProductSelectProps {
  products: Product[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}

function SearchableProductSelect({
  products,
  selectedId,
  onSelect,
  placeholder = "What are you returning?"
}: SearchableProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [search]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && typeof p.sku === 'string' && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedProduct = products.find(p => p.id === selectedId);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => 
        filtered.length > 0 ? (prev + 1) % filtered.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => 
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && focusedIndex < filtered.length) {
        onSelect(filtered[focusedIndex].id);
        setIsOpen(false);
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm italic shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left"
      >
        <span className={cn("truncate", !selectedId && "text-slate-400")}>
          {selectedProduct ? (
            selectedProduct.sku ? `${selectedProduct.name} (${selectedProduct.sku})` : selectedProduct.name
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform duration-200", isOpen && "transform rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] left-0 right-0 top-[calc(100%+4px)] max-h-60 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg flex flex-col pt-2 pb-1 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <div className="px-2 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              className="w-full text-xs outline-none bg-transparent placeholder:text-slate-400 text-slate-800"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-[180px] mt-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium font-sans">
                No product found
              </div>
            ) : (
              filtered.map((p, index) => {
                const isSelected = p.id === selectedId;
                const isFocused = index === focusedIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-medium font-sans flex items-center justify-between transition-colors",
                      isSelected 
                        ? "bg-slate-100 text-slate-900 font-bold" 
                        : isFocused 
                          ? "bg-slate-50 text-slate-900" 
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <span className="truncate">
                      {p.name} {p.sku ? `(${p.sku})` : ''}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReturnsManagement() {
  const { profile } = useAuth();
  const [storeReturns, setStoreReturns] = useState<ProjectReturn[]>([]);
  const [vendorReturns, setVendorReturns] = useState<ReturnToVendor[]>([]);
  const [storeCurrentPage, setStoreCurrentPage] = useState(1);
  const [vendorCurrentPage, setVendorCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sorted lists
  const sortedStoreReturns = [...storeReturns].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sortedVendorReturns = [...vendorReturns].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginated lists
  const paginatedStoreReturns = sortedStoreReturns.slice((storeCurrentPage - 1) * itemsPerPage, storeCurrentPage * itemsPerPage);
  const paginatedVendorReturns = sortedVendorReturns.slice((vendorCurrentPage - 1) * itemsPerPage, vendorCurrentPage * itemsPerPage);

  const getStoreTotalPages = () => Math.ceil(sortedStoreReturns.length / itemsPerPage);
  const getVendorTotalPages = () => Math.ceil(sortedVendorReturns.length / itemsPerPage);

  const getStorePageNumbers = () => {
    const totalPages = getStoreTotalPages();
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (storeCurrentPage > 3) pages.push('ellipsis1');
      const start = Math.max(2, storeCurrentPage - 1);
      const end = Math.min(totalPages - 1, storeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (storeCurrentPage < totalPages - 2) pages.push('ellipsis2');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const getVendorPageNumbers = () => {
    const totalPages = getVendorTotalPages();
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (vendorCurrentPage > 3) pages.push('ellipsis1');
      const start = Math.max(2, vendorCurrentPage - 1);
      const end = Math.min(totalPages - 1, vendorCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (vendorCurrentPage < totalPages - 2) pages.push('ellipsis2');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [activeTab, setActiveTab] = useState<'STORE' | 'VENDOR'>('STORE');
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isVendorOpen, setIsVendorOpen] = useState(false);

  const getProjectDisplayName = (projectId: string, proj?: Project, fallbackName?: string): string => {
    if (proj?.name && !/^[a-zA-Z0-9]{18,22}$/.test(proj.name)) {
      return proj.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    const nameToTest = proj?.name || fallbackName;
    if (nameToTest && /^[a-zA-Z0-9]{18,22}$/.test(nameToTest)) {
      return `Horizon Project (${nameToTest.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9]{18,22}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    // General check if string looks like an auto-generated Firestore ID
    if (nameToTest && /^[a-zA-Z0-9_-]{5,30}$/.test(nameToTest)) {
      return `Horizon Project (${nameToTest.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return nameToTest || projectId || 'Grand Horizon Mall';
  };

  const getVendorDisplayName = (vendorId: string, vend?: Vendor, fallbackName?: string): string => {
    if (vend?.name && !/^[a-zA-Z0-9]{18,22}$/.test(vend.name)) {
      return vend.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Apex Industrial Supplies',
      'demo-vendor': 'Apex Industrial Supplies',
    };
    if (defaultMappings[vendorId]) return defaultMappings[vendorId];
    const nameToTest = vend?.name || fallbackName;
    if (nameToTest && /^[a-zA-Z0-9]{18,22}$/.test(nameToTest)) {
      return `Apex Vendor (${nameToTest.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9]{18,22}$/.test(vendorId)) {
      return `Apex Vendor (${vendorId.substring(0, 6).toUpperCase()})`;
    }
    if (nameToTest && /^[a-zA-Z0-9_-]{5,30}$/.test(nameToTest)) {
      return `Apex Vendor (${nameToTest.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(vendorId)) {
      return `Apex Vendor (${vendorId.substring(0, 6).toUpperCase()})`;
    }
    return nameToTest || vendorId || 'Apex Industrial Supplies';
  };

  // Form States
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState<'GOOD' | 'DAMAGED' | 'UNUSABLE'>('GOOD');
  const [returnType, setReturnType] = useState<'UNUSED_MATERIAL' | 'EXCESS_MATERIAL' | 'DAMAGED_MATERIAL' | 'WRONG_MATERIAL'>('UNUSED_MATERIAL');

  useEffect(() => {
    const unsubStore = ProjectReturnService.subscribe(setStoreReturns);
    const unsubVendor = ReturnToVendorService.subscribe(setVendorReturns);
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubProjects = ProjectService.subscribe(setProjects);
    const unsubVendors = VendorService.subscribe(setVendors);
    const unsubStocks = InventoryService.subscribe(setStocks);

    return () => {
      unsubStore();
      unsubVendor();
      unsubProducts();
      unsubProjects();
      unsubVendors();
      unsubStocks();
    };
  }, []);

  // When selected project changes, clear the selected product to avoid mismatching
  const handleProjectChange = (projId: string) => {
    setSelectedProject(projId);
    setSelectedProduct('');
  };

  // Only products that are actually issued and have positive stock on the selected project site
  const returnableProducts = useMemo(() => {
    if (!selectedProject) return [];
    const siteStocks = stocks.filter(s => s.projectId === selectedProject && s.quantity > 0);
    return products.filter(p => siteStocks.some(s => s.productId === p.id));
  }, [products, stocks, selectedProject]);

  // Find active stock item for selected project/product to perform validation
  const selectedStockItem = useMemo(() => {
    if (!selectedProject || !selectedProduct) return null;
    return stocks.find(s => s.projectId === selectedProject && s.productId === selectedProduct);
  }, [stocks, selectedProject, selectedProduct]);

  const isStoreFormInvalid = useMemo(() => {
    if (!selectedProject || !selectedProduct || !quantity || !reason || !returnType) return true;
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return true;
    if (!selectedStockItem || qty > selectedStockItem.quantity) return true;
    return false;
  }, [selectedProject, selectedProduct, quantity, reason, selectedStockItem, returnType]);

  const isVendorFormInvalid = useMemo(() => {
    if (!selectedProject || !selectedProduct || !selectedVendor || !quantity || !reason) return true;
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return true;
    if (!selectedStockItem || qty > selectedStockItem.quantity) return true;
    return false;
  }, [selectedProject, selectedProduct, selectedVendor, quantity, reason, selectedStockItem]);

  const handleCreateStoreReturn = async () => {
    if (!selectedProduct || !selectedProject || !quantity || !reason || !returnType) {
      return toast.error('Please fill all required fields');
    }

    // Validate that the material exists in the selected project/site inventory and has stock
    const matchedStock = stocks.find(s => s.projectId === selectedProject && s.productId === selectedProduct);
    if (!matchedStock || matchedStock.quantity <= 0) {
      return toast.error("⚠ This material does not exist in the selected project inventory and cannot be returned.");
    }

    const returnQty = Number(quantity);
    if (isNaN(returnQty) || returnQty <= 0) {
      return toast.error("Please enter a valid return quantity");
    }

    if (returnQty > matchedStock.quantity) {
      return toast.error(`⚠ Return quantity cannot exceed available site quantity (${matchedStock.quantity}).`);
    }

    const product = products.find(p => p.id === selectedProduct);
    const project = projects.find(p => p.id === selectedProject);

    try {
      await ProjectReturnService.create({
        returnNumber: `RTW-${Math.floor(1000 + Math.random() * 9000)}`,
        projectId: selectedProject,
        projectName: project?.name || selectedProject,
        productId: selectedProduct,
        productName: product?.name || selectedProduct,
        issuedQuantity: matchedStock.quantity, // Setting to current site stock
        currentSiteStock: matchedStock.quantity,
        returnQuantity: returnQty,
        returnType,
        condition,
        remarks: reason,
        photoUrls: [], // Placeholder for attachments
        status: 'SUBMITTED',
        requesterId: profile?.uid || '',
        requesterName: profile?.name || 'Unknown',
        history: [{
          status: 'SUBMITTED',
          userId: profile?.uid || '',
          userName: profile?.name || 'Unknown',
          timestamp: new Date().toISOString(),
          notes: 'Return request submitted'
        }]
      });
      toast.success('Return request submitted for warehouse review');
      setIsStoreOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to submit return request');
    }
  };

  const handleCreateVendorReturn = async () => {
    if (!selectedProduct || !selectedProject || !selectedVendor || !quantity || !reason) {
      return toast.error('Please fill all required fields');
    }

    // Validate that the material exists in the selected project/site inventory and has stock
    const matchedStock = stocks.find(s => s.projectId === selectedProject && s.productId === selectedProduct);
    if (!matchedStock || matchedStock.quantity <= 0) {
      return toast.error("⚠ This material does not exist in the selected project inventory and cannot be returned.");
    }

    const returnQty = Number(quantity);
    if (isNaN(returnQty) || returnQty <= 0) {
      return toast.error("Please enter a valid return quantity");
    }

    if (returnQty > matchedStock.quantity) {
      return toast.error(`⚠ Return quantity cannot exceed available site quantity (${matchedStock.quantity}).`);
    }

    const product = products.find(p => p.id === selectedProduct);
    const project = projects.find(p => p.id === selectedProject);
    const vendor = vendors.find(v => v.id === selectedVendor);

    try {
      await ReturnToVendorService.create({
        rtvNumber: `RTV-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorId: selectedVendor,
        vendorName: getVendorDisplayName(selectedVendor, vendor),
        productId: selectedProduct,
        productName: product?.name || '',
        quantity: Number(quantity),
        projectId: selectedProject,
        projectName: getProjectDisplayName(selectedProject, project),
        reason,
        damageStatus: condition === 'DAMAGED',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
      toast.success('Vendor return request submitted');
      setIsVendorOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to submit return request');
    }
  };

  const handleApproveStore = async (id: string, action: 'WAREHOUSE_REVIEW' | 'APPROVED' | 'RETURNED' | 'REJECTED') => {
    if (!profile) return;
    try {
      if (action === 'RETURNED') {
        await ProjectReturnService.processReturnToWarehouse(id, profile.uid, profile.name);
        toast.success('Return processed and inventory updated');
      } else {
         await ProjectReturnService.updateStatus(id, action, profile.uid, profile.name);
         toast.success(`Return status updated to ${action}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleApproveVendor = async (id: string) => {
    try {
      await ReturnToVendorService.approve(id, profile?.uid || '', profile?.name || 'System');
      toast.success('Vendor return approved and stock deducted');
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const resetForm = () => {
    setSelectedProduct('');
    setSelectedProject('');
    setSelectedVendor('');
    setQuantity('');
    setReason('');
    setCondition('GOOD');
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 font-sans pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-3">
             <RotateCcw className="w-8 h-8 text-primary" />
             Material Returns Management
          </h1>
          <p className="text-slate-500 font-medium italic mt-1 uppercase text-xs tracking-widest leading-none">Process unused or defective materials back to store or vendors</p>
        </div>
        <div className="flex gap-3">
           <Dialog open={isStoreOpen} onOpenChange={setIsStoreOpen}>
             <DialogTrigger render={
               <Button className="rounded-xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm gap-2">
                 <ClipboardList className="w-4 h-4" />
                 Initiate Store Return
               </Button>
             } />
             <DialogContent className="rounded-[2.5rem] sm:max-w-lg overflow-y-auto max-h-[90vh]">
               <DialogHeader>
                 <DialogTitle className="text-2xl font-black font-heading italic text-slate-900 flex items-center gap-3">
                   <RotateCcw className="w-6 h-6 text-primary" />
                   Return to Store
                 </DialogTitle>
                 <DialogDescription className="font-mono text-[10px] font-black uppercase tracking-widest">Formal request to return site materials</DialogDescription>
               </DialogHeader>
               <div className="space-y-6 pt-4 italic">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Project Site*</Label>
                    <Select value={selectedProject} onValueChange={handleProjectChange}>
                      <SelectTrigger className="rounded-xl border-slate-200 h-10 italic">
                        <SelectValue placeholder="Which project is returning?">
                          {selectedProject ? getProjectDisplayName(selectedProject, projects.find(p => p.id === selectedProject)) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{getProjectDisplayName(p.id, p)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Product*</Label>
                    <SearchableProductSelect
                      products={returnableProducts}
                      selectedId={selectedProduct}
                      onSelect={setSelectedProduct}
                      placeholder={selectedProject ? "What are you returning?" : "Please select a project site first"}
                    />
                    {selectedProject && returnableProducts.length === 0 && (
                      <p className="text-xs text-red-500 font-bold mt-1">
                        ⚠ No materials are currently issued/available at this project site.
                      </p>
                    )}
                    {selectedProject && selectedProduct && (
                      <div className="mt-1">
                        {!selectedStockItem || selectedStockItem.quantity <= 0 ? (
                          <p className="text-xs text-red-500 font-bold">
                            ⚠ This material does not exist in the selected project inventory and cannot be returned.
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-slate-500">
                            Available issued stock at site: <span className="font-bold text-slate-800">{selectedStockItem.quantity}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Return Type*</Label>
                    <Select value={returnType} onValueChange={(val: any) => setReturnType(val)}>
                      <SelectTrigger className="rounded-xl italic">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="UNUSED_MATERIAL">Unused Material</SelectItem>
                        <SelectItem value="EXCESS_MATERIAL">Excess Material</SelectItem>
                        <SelectItem value="DAMAGED_MATERIAL">Damaged Material</SelectItem>
                        <SelectItem value="WRONG_MATERIAL">Wrong Material Issued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Quantity*</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="rounded-xl italic"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                      />
                      {selectedStockItem && quantity && Number(quantity) > selectedStockItem.quantity && (
                        <p className="text-xs text-red-500 font-bold mt-1">
                          ⚠ Return quantity cannot exceed available site quantity ({selectedStockItem.quantity}).
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Condition*</Label>
                      <Select value={condition} onValueChange={(val: any) => setCondition(val)}>
                        <SelectTrigger className="rounded-xl italic">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="GOOD">Good / Unused</SelectItem>
                          <SelectItem value="DAMAGED">Damaged</SelectItem>
                          <SelectItem value="UNUSABLE">Unusable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Reason for Return*</Label>
                    <Textarea 
                      placeholder="Why is the material being returned?" 
                      className="rounded-xl min-h-[80px] italic"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Photos (Optional)</Label>
                    <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center justify-center space-y-2 group block w-full">
                      <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                      <div className="text-xs font-medium text-slate-500">
                        Click to upload photos (Max 3)
                      </div>
                      <input type="file" multiple accept="image/*" className="hidden" />
                    </label>
                  </div>
               </div>
               <DialogFooter className="mt-8">
                  <Button variant="ghost" className="rounded-xl font-bold italic" onClick={() => setIsStoreOpen(false)}>Cancel</Button>
                  <Button 
                    className="rounded-xl font-black italic bg-primary shadow-lg shadow-primary/20 px-8" 
                    onClick={handleCreateStoreReturn}
                    disabled={isStoreFormInvalid}
                  >
                    Submit Return Request
                  </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>

           <Dialog open={isVendorOpen} onOpenChange={setIsVendorOpen}>
             <DialogTrigger render={
               <Button className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2">
                 <Truck className="w-4 h-4" />
                 Return to Vendor
               </Button>
             } />
             <DialogContent className="rounded-[2.5rem] sm:max-w-lg overflow-y-auto max-h-[90vh]">
               <DialogHeader>
                 <DialogTitle className="text-2xl font-black font-heading italic text-slate-900 flex items-center gap-3">
                   <Truck className="w-6 h-6 text-primary" />
                   Return to Vendor (RTV)
                 </DialogTitle>
                 <DialogDescription className="font-mono text-[10px] font-black uppercase tracking-widest">For defective, extra, or wrong materials</DialogDescription>
               </DialogHeader>
               <div className="space-y-5 pt-4 italic">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Vendor*</Label>
                    <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                      <SelectTrigger className="rounded-xl italic">
                        <SelectValue placeholder="Which vendor are you returning to?">
                          {selectedVendor ? getVendorDisplayName(selectedVendor, vendors.find(v => v.id === selectedVendor)) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {vendors.map(v => (
                          <SelectItem key={v.id} value={v.id}>{getVendorDisplayName(v.id, v)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Project Context*</Label>
                      <Select value={selectedProject} onValueChange={handleProjectChange}>
                        <SelectTrigger className="rounded-xl italic">
                          <SelectValue placeholder="From which project?">
                            {selectedProject ? getProjectDisplayName(selectedProject, projects.find(p => p.id === selectedProject)) : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{getProjectDisplayName(p.id, p)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Product*</Label>
                      <SearchableProductSelect
                        products={returnableProducts}
                        selectedId={selectedProduct}
                        onSelect={setSelectedProduct}
                        placeholder={selectedProject ? "Item to return" : "Select project first"}
                      />
                      {selectedProject && returnableProducts.length === 0 && (
                        <p className="text-xs text-red-500 font-bold mt-1">
                          ⚠ No materials are currently issued/available at this project site.
                        </p>
                      )}
                      {selectedProject && selectedProduct && (
                        <div className="mt-1">
                          {!selectedStockItem || selectedStockItem.quantity <= 0 ? (
                            <p className="text-xs text-red-500 font-bold">
                              ⚠ This material does not exist in the selected project inventory and cannot be returned.
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-slate-500">
                              Available issued stock at site: <span className="font-bold text-slate-800">{selectedStockItem.quantity}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Quantity*</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="rounded-xl italic"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                      />
                      {selectedStockItem && quantity && Number(quantity) > selectedStockItem.quantity && (
                        <p className="text-xs text-red-500 font-bold mt-1">
                          ⚠ Return quantity cannot exceed available site quantity ({selectedStockItem.quantity}).
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Damage Status*</Label>
                      <Select value={condition} onValueChange={(val: any) => setCondition(val)}>
                        <SelectTrigger className="rounded-xl italic">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="GOOD">Not Damaged (Extra Stock)</SelectItem>
                          <SelectItem value="DAMAGED">Damaged / Defective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Reason & RTV Notes*</Label>
                    <Textarea 
                      placeholder="Describe the reason for return..." 
                      className="rounded-xl min-h-[80px] italic"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    />
                  </div>
               </div>
               <DialogFooter className="mt-8">
                  <Button variant="ghost" className="rounded-xl font-bold italic" onClick={() => setIsVendorOpen(false)}>Cancel</Button>
                  <Button 
                    className="rounded-xl font-black italic bg-primary shadow-lg shadow-primary/20 px-8" 
                    onClick={handleCreateVendorReturn}
                    disabled={isVendorFormInvalid}
                  >
                    Submit RTV Request
                  </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
        </div>
      </div>

      <Tabs defaultValue="STORE" onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
           <TabsTrigger value="STORE" className="rounded-xl px-8 font-black italic tracking-tighter">
             <Box className="w-4 h-4 mr-2" />
             Returns to Store ({storeReturns.length})
           </TabsTrigger>
           <TabsTrigger value="VENDOR" className="rounded-xl px-8 font-black italic tracking-tighter">
             <Truck className="w-4 h-4 mr-2" />
             Returns to Vendor ({vendorReturns.length})
           </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="STORE" className="m-0 focus-visible:outline-none">
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative min-h-[400px]">
                <div className="overflow-x-auto w-full">
                  <div className="hidden md:block min-w-full">
               <div className="overflow-x-auto w-full">
                 <div className="hidden md:block min-w-full">
                <Table compact>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="py-5 pl-8 font-black text-slate-900 italic tracking-tighter">Return Info</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Product</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter text-right">Qty</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Condition</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Project / Site</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Status</TableHead>
                      <TableHead className="py-5 pr-8 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {paginatedStoreReturns.map((ret, idx) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={ret.id} 
                          className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="py-5 pl-8 italic">
                             <div className="flex flex-col">
                               <span className="font-bold text-slate-900 leading-none">{ret.returnNumber}</span>
                               <span className="text-[10px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-widest">{ret.createdAt ? format(new Date(ret.createdAt), 'MMM dd, yyyy') : 'Recently'}</span>
                             </div>
                          </TableCell>
                          <TableCell className="italic">
                             <div className="flex flex-col">
                               <span className="font-bold text-slate-900">{ret.productName}</span>
                               <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-tight">{ret.requesterName}</span>
                             </div>
                          </TableCell>
                          <TableCell className="text-right">
                             <span className="font-black font-mono text-slate-900 leading-none">{ret.returnQuantity}</span>
                          </TableCell>
                          <TableCell>
                             <Badge variant="outline" className={cn(
                               "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase italic tracking-widest",
                               ret.condition === 'GOOD' ? "bg-green-500/10 text-green-600 border-green-200" : "bg-red-500/10 text-red-600 border-red-200"
                             )}>
                               {ret.condition}
                             </Badge>
                             <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase">
                               {ret.returnType.replace(/_/g, ' ')}
                             </div>
                          </TableCell>
                          <TableCell className="italic text-xs font-semibold text-slate-600">
                             <div className="flex items-center gap-1.5 grayscale opacity-60">
                               <MapPin className="w-3.5 h-3.5" />
                               {getProjectDisplayName(ret.projectId, projects.find(p => p.id === ret.projectId), ret.projectName)}
                             </div>
                          </TableCell>
                          <TableCell>
                             <Badge variant={ret.status === 'APPROVED' ? 'default' : ret.status === 'RETURNED' ? 'default' : ret.status === 'REJECTED' ? 'destructive' : 'secondary'} className="rounded-full px-3 py-1 font-black italic tracking-tighter shadow-sm">
                               {ret.status}
                             </Badge>
                          </TableCell>
                          <TableCell className="py-5 pr-8 text-right italic">
                             {ret.status === 'SUBMITTED' && (profile?.role === 'ADMIN' || profile?.role === 'STORE_KEEPER') && (
                               <div className="flex justify-end gap-2 shrink-0">
                                  <Button size="sm" variant="outline" className="rounded-xl h-9 font-bold bg-green-50 text-green-600 border-green-100 hover:bg-green-100" onClick={() => handleApproveStore(ret.id, 'APPROVED')}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                               </div>
                             )}
                             {ret.status === 'APPROVED' && (profile?.role === 'ADMIN' || profile?.role === 'STORE_KEEPER') && (
                               <div className="flex justify-end gap-2 shrink-0">
                                  <Button size="sm" variant="outline" className="rounded-xl h-9 font-bold bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100" onClick={() => handleApproveStore(ret.id, 'RETURNED')}>
                                    <Box className="w-4 h-4 mr-2" />
                                    Mark as Returned
                                  </Button>
                               </div>
                             )}
                          </TableCell>
                        </motion.tr>
                      ))}
                      {paginatedStoreReturns.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-64 text-center italic">
                             <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                               <RotateCcw className="w-12 h-12" />
                               <p className="font-black italic text-lg tracking-tight">No store returns logged yet</p>
                             </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden flex flex-col gap-4 p-4">
                  {paginatedStoreReturns.map((ret, idx) => (
                    <motion.div 
                      key={ret.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white border text-sm border-slate-100 p-4 flex flex-col gap-3 rounded-2xl shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="font-bold text-slate-900">{ret.productName}</p>
                            <p className="text-[10px] text-slate-500 font-mono italic mt-0.5">{ret.returnNumber}</p>
                         </div>
                         <Badge variant={ret.status === 'APPROVED' ? 'default' : ret.status === 'RETURNED' ? 'default' : ret.status === 'REJECTED' ? 'destructive' : 'secondary'} className="rounded-full px-2 py-0.5 font-bold tracking-tighter text-[9px] uppercase">
                           {ret.status}
                         </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{getProjectDisplayName(ret.projectId, projects.find(p => p.id === ret.projectId), ret.projectName)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex flex-col">
                           <Badge variant="outline" className={cn(
                             "w-fit rounded-lg px-2 py-0.5 text-[9px] font-black uppercase italic tracking-widest mb-1",
                             ret.condition === 'GOOD' ? "bg-green-500/10 text-green-600 border-green-200" : "bg-red-500/10 text-red-600 border-red-200"
                           )}>
                             {ret.condition}
                           </Badge>
                           <span className="text-[9px] font-mono text-slate-500 uppercase">{ret.returnType.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black font-mono text-slate-900">{ret.returnQuantity}</span>
                          <span className="text-[10px] text-slate-400 ml-1">QTY</span>
                        </div>
                      </div>

                      {ret.status === 'SUBMITTED' && (profile?.role === 'ADMIN' || profile?.role === 'STORE_KEEPER') && (
                        <div className="flex gap-2 w-full mt-2">
                           <Button size="sm" variant="outline" className="flex-1 rounded-xl h-9 font-bold bg-green-50 text-green-600 border-green-100" onClick={() => handleApproveStore(ret.id, 'APPROVED')}>
                             Approve
                           </Button>
                        </div>
                      )}
                      {ret.status === 'APPROVED' && (profile?.role === 'ADMIN' || profile?.role === 'STORE_KEEPER') && (
                        <div className="flex gap-2 w-full mt-2">
                           <Button size="sm" variant="outline" className="flex-1 rounded-xl h-9 font-bold bg-blue-50 text-blue-600 border-blue-100" onClick={() => handleApproveStore(ret.id, 'RETURNED')}>
                             <Box className="w-4 h-4 mr-2" /> Mark Returned
                           </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {paginatedStoreReturns.length === 0 && (
                    <div className="h-40 flex flex-col items-center justify-center space-y-3 opacity-30 text-center">
                       <RotateCcw className="w-8 h-8" />
                       <p className="font-black italic tracking-tight">No store returns logged yet</p>
                    </div>
                  )}
                </div>
               </div>
                </div>
                
                 {/* Mobile View */}
                 <div className="md:hidden flex flex-col divide-y divide-slate-100">
                    {paginatedStoreReturns.length === 0 ? (
                       <div className="p-8 text-center text-slate-500 italic">No store returns logged yet</div>
                    ) : paginatedStoreReturns.map((ret) => (
                       <div key={ret.id} className="p-4 flex flex-col gap-3 group hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start">
                             <div className="flex flex-col">
                                <span className="font-bold text-slate-900 leading-none">{ret.returnNumber}</span>
                                <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">{ret.createdAt ? format(new Date(ret.createdAt), 'MMM dd, yyyy') : 'Recently'}</span>
                             </div>
                             <Badge variant={ret.status === 'APPROVED' ? 'default' : ret.status === 'RETURNED' ? 'default' : ret.status === 'REJECTED' ? 'destructive' : 'secondary'} className="rounded-full px-2 py-0.5 font-black italic text-[10px]">
                                {ret.status}
                             </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-1">
                             <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Product</span>
                                <span className="text-xs font-bold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit">{ret.productName}</span>
                             </div>
                             <div className="flex flex-col text-right">
                                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Return Qty</span>
                                <span className="text-sm font-mono text-slate-900 font-black leading-none">{ret.returnQuantity}</span>
                             </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs">
                              <div className="flex flex-col">
                                 <Badge variant="outline" className={cn(
                                    "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase italic tracking-widest w-fit",
                                    ret.condition === 'GOOD' ? "bg-green-500/10 text-green-600 border-green-200" : "bg-red-500/10 text-red-600 border-red-200"
                                  )}>
                                    {ret.condition}
                                  </Badge>
                                  <span className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase">{ret.returnType.replace(/_/g, ' ')}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                 <span className="font-bold text-slate-600">{getProjectDisplayName(ret.projectId, projects.find(p => p.id === ret.projectId), ret.projectName)}</span>
                                 <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-tight">{ret.requesterName}</span>
                              </div>
                          </div>
                          
                          <div className="flex justify-end mt-1">
                             {ret.status === 'SUBMITTED' && (profile?.role === 'ADMIN' || profile?.role === 'STORE_KEEPER') && (
                                 <Button size="sm" variant="outline" className="rounded-xl h-9 font-bold bg-green-50 text-green-600 border-green-100 w-full" onClick={() => handleApproveStore(ret.id, 'APPROVED')}>
                                   <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                                 </Button>
                              )}
                              {ret.status === 'APPROVED' && (profile?.role === 'ADMIN' || profile?.role === 'STORE_KEEPER') && (
                                 <Button size="sm" variant="outline" className="rounded-xl h-9 font-bold bg-blue-50 text-blue-600 border-blue-100 w-full" onClick={() => handleApproveStore(ret.id, 'RETURNED')}>
                                   <Box className="w-4 h-4 mr-2" /> Mark as Returned
                                 </Button>
                              )}
                          </div>
                       </div>
                    ))}
                 </div>
                </div>
                {getStoreTotalPages() > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 rounded-b-[2.5rem]">
                    <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
                      Page {storeCurrentPage} of {getStoreTotalPages()} <span className="text-slate-200 mx-2">|</span> Showing {Math.min((storeCurrentPage - 1) * itemsPerPage + 1, storeReturns.length)}-{Math.min(storeCurrentPage * itemsPerPage, storeReturns.length)} of {storeReturns.length} Store Returns
                    </p>
                    <div className="flex items-center gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
                         disabled={storeCurrentPage === 1}
                         onClick={() => setStoreCurrentPage(prev => Math.max(prev - 1, 1))}
                       >
                         Previous
                       </Button>
                       
                       {getStorePageNumbers().map((page, index) => {
                         if (typeof page === 'string') {
                           return <span key={`ellipse-${index}`} className="text-slate-400 font-mono text-xs px-1 font-bold">...</span>;
                         }
                         return (
                           <Button
                             key={page}
                             variant={storeCurrentPage === page ? 'default' : 'outline'}
                             size="sm"
                             className={`h-9 w-9 p-0 rounded-lg font-mono font-bold transition-all ${
                               storeCurrentPage === page ? "bg-primary shadow-sm shadow-primary/10 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                             }`}
                             onClick={() => setStoreCurrentPage(page)}
                           >
                             {page}
                           </Button>
                         );
                       })}

                       <Button
                         variant="outline"
                         size="sm"
                         className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
                         disabled={storeCurrentPage === getStoreTotalPages()}
                         onClick={() => setStoreCurrentPage(prev => Math.min(prev + 1, getStoreTotalPages()))}
                       >
                         Next
                       </Button>
                    </div>
                  </div>
                )}
             </div>
          </TabsContent>

          <TabsContent value="VENDOR" className="m-0 focus-visible:outline-none">
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative min-h-[400px]">
               <div className="overflow-x-auto w-full">
                  <div className="hidden md:block min-w-full">
                <Table compact>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="py-5 pl-8 font-black text-slate-900 italic tracking-tighter">RTV Number</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Vendor & Product</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter text-right">Qty</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Damage</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Status</TableHead>
                      <TableHead className="font-black text-slate-900 italic tracking-tighter">Created At</TableHead>
                      <TableHead className="py-5 pr-8 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {paginatedVendorReturns.map((rtv, idx) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={rtv.id} 
                          className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors italic"
                        >
                          <TableCell className="py-5 pl-8 italic">
                             <span className="font-black text-primary italic tracking-tighter leading-none">{rtv.rtvNumber}</span>
                          </TableCell>
                          <TableCell className="italic">
                             <div className="flex flex-col">
                               <span className="font-bold text-slate-900">{getVendorDisplayName(rtv.vendorId, vendors.find(v => v.id === rtv.vendorId), rtv.vendorName)}</span>
                               <span className="text-[10px] font-mono text-slate-400 font-black uppercase tracking-tight italic">{rtv.productName}</span>
                             </div>
                          </TableCell>
                          <TableCell className="text-right">
                             <span className="font-black font-mono text-slate-900 tracking-tighter">{rtv.quantity}</span>
                          </TableCell>
                          <TableCell>
                             <Badge variant="outline" className={cn(
                               "rounded-lg px-2 py-0.5 text-[9px] font-black italic tracking-widest uppercase",
                               rtv.damageStatus ? "bg-red-500/10 text-red-600 border-red-200" : "bg-blue-500/10 text-blue-600 border-blue-200"
                             )}>
                               {rtv.damageStatus ? 'YES' : 'NO'}
                             </Badge>
                          </TableCell>
                          <TableCell>
                             <Badge variant={rtv.status === 'APPROVED' ? 'default' : rtv.status === 'REJECTED' ? 'destructive' : 'secondary'} className="rounded-full px-3 py-1 italic font-black tracking-tighter">
                               {rtv.status}
                             </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono font-bold text-slate-400 uppercase italic tracking-widest">
                            {rtv.createdAt ? format(new Date(rtv.createdAt), 'MMM dd, HH:mm') : 'Recently'}
                          </TableCell>
                          <TableCell className="py-5 pr-8 text-right italic">
                             {rtv.status === 'PENDING' && (profile?.role === 'ADMIN' || profile?.role === 'PROJECT_MANAGER') && (
                               <Button size="sm" variant="outline" className="rounded-xl h-9 font-bold bg-primary/5 text-primary border-primary/20 hover:bg-primary/10" onClick={() => handleApproveVendor(rtv.id)}>
                                 Verify & Process Return
                               </Button>
                             )}
                          </TableCell>
                        </motion.tr>
                      ))}
                      {paginatedVendorReturns.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-64 text-center">
                             <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                               <Truck className="w-12 h-12" />
                               <p className="font-black italic text-lg tracking-tight">No vendor returns processed</p>
                             </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
                  </div>
                  
                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col divide-y divide-slate-100">
                     {paginatedVendorReturns.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 italic">No vendor returns processed</div>
                     ) : paginatedVendorReturns.map((rtv) => (
                        <div key={rtv.id} className="p-4 flex flex-col gap-3 group hover:bg-slate-50/50 transition-colors">
                           <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                 <span className="font-black text-primary leading-none">{rtv.rtvNumber}</span>
                                 <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">{rtv.createdAt ? format(new Date(rtv.createdAt), 'MMM dd, yyyy') : 'Recently'}</span>
                              </div>
                              <Badge variant={rtv.status === 'APPROVED' ? 'default' : rtv.status === 'REJECTED' ? 'destructive' : 'secondary'} className="rounded-full px-2 py-0.5 font-black italic text-[10px]">
                                 {rtv.status}
                              </Badge>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-2 mt-1">
                              <div className="flex flex-col">
                                 <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Vendor</span>
                                 <span className="text-xs font-bold text-slate-900">{getVendorDisplayName(rtv.vendorId, vendors.find(v => v.id === rtv.vendorId), rtv.vendorName)}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                 <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Quantity</span>
                                 <span className="text-sm font-mono text-slate-900 font-black leading-none">{rtv.quantity}</span>
                              </div>
                           </div>
                           
                           <div className="flex justify-between items-center text-xs mt-1">
                               <Badge variant="outline" className={cn(
                                 "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase italic tracking-widest",
                                 rtv.damageStatus ? "bg-red-500/10 text-red-600 border-red-200" : "bg-blue-500/10 text-blue-600 border-blue-200"
                               )}>
                                 {rtv.damageStatus ? 'DAMAGED' : 'GOOD'}
                               </Badge>
                               <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tight italic">{rtv.productName}</span>
                           </div>
                           
                           {rtv.status === 'PENDING' && (profile?.role === 'ADMIN' || profile?.role === 'PROJECT_MANAGER') && (
                               <Button size="sm" variant="outline" className="rounded-xl h-9 font-bold bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 w-full mt-2" onClick={() => handleApproveVendor(rtv.id)}>
                                 Verify & Process Return
                               </Button>
                           )}
                        </div>
                     ))}
                  </div>
                </div>
                {getVendorTotalPages() > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 rounded-b-[2.5rem]">
                    <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
                      Page {vendorCurrentPage} of {getVendorTotalPages()} <span className="text-slate-200 mx-2">|</span> Showing {Math.min((vendorCurrentPage - 1) * itemsPerPage + 1, vendorReturns.length)}-{Math.min(vendorCurrentPage * itemsPerPage, vendorReturns.length)} of {vendorReturns.length} Vendor Returns
                    </p>
                    <div className="flex items-center gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
                         disabled={vendorCurrentPage === 1}
                         onClick={() => setVendorCurrentPage(prev => Math.max(prev - 1, 1))}
                       >
                         Previous
                       </Button>
                       
                       {getVendorPageNumbers().map((page, index) => {
                         if (typeof page === 'string') {
                           return <span key={`ellipse-${index}`} className="text-slate-400 font-mono text-xs px-1 font-bold">...</span>;
                         }
                         return (
                           <Button
                             key={page}
                             variant={vendorCurrentPage === page ? 'default' : 'outline'}
                             size="sm"
                             className={`h-9 w-9 p-0 rounded-lg font-mono font-bold transition-all ${
                               vendorCurrentPage === page ? "bg-primary shadow-sm shadow-primary/10 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                             }`}
                             onClick={() => setVendorCurrentPage(page)}
                           >
                             {page}
                           </Button>
                         );
                       })}

                       <Button
                         variant="outline"
                         size="sm"
                         className="h-9 rounded-lg px-3 font-bold border-slate-200 bg-white"
                         disabled={vendorCurrentPage === getVendorTotalPages()}
                         onClick={() => setVendorCurrentPage(prev => Math.min(prev + 1, getVendorTotalPages()))}
                       >
                         Next
                       </Button>
                    </div>
                  </div>
                )}
             </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
