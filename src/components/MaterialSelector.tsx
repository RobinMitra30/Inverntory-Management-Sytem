import React, { useState, useMemo } from 'react';
import { Product } from '@/types';
import { ProductService } from '@/services/store';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Plus, 
  Check, 
  ChevronDown, 
  Package, 
  AlertCircle 
} from 'lucide-react';
import { cn, formatMaterialName } from '@/lib/utils';
import { toast } from 'sonner';

interface MaterialSelectorProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  className?: string;
  warehouseStocks?: Record<string, number>;
}

export function MaterialSelector({ 
  products, 
  selectedProductId, 
  onSelect, 
  className,
  warehouseStocks = {} 
}: MaterialSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const lowerSearch = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.category?.toLowerCase().includes(lowerSearch)
    );
  }, [products, search]);

  // Fuzzy match or similarity check for preventing duplicates
  const similarProducts = useMemo(() => {
    if (!search || search.length < 3) return [];
    const lowerSearch = search.toLowerCase();
    return products.filter(p => {
       const lowerName = p.name.toLowerCase();
       // Simple fuzzy check: if search is substring or name is substring or common prefix
       return lowerName.includes(lowerSearch) || lowerSearch.includes(lowerName);
    });
  }, [products, search]);

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    
    // Check for exact duplicate again just in case
    const exactMatch = products.find(p => p.name.toLowerCase() === newName.trim().toLowerCase());
    if (exactMatch) {
      toast.error('Material already exists', {
        description: `Found: ${exactMatch.name}`
      });
      onSelect(exactMatch.id!);
      setIsAddingNew(false);
      setOpen(false);
      return;
    }

    try {
      // In a real app, you might want more fields, but for quick add we use defaults
      const tempId = `temp-${Date.now()}`;
      await ProductService.add({
        name: newName.trim(),
        category: 'General',
        subcategory: 'General',
        uom: 'Units',
        sku: `MAT-${Date.now().toString().slice(-6)}`,
        description: 'Added via requisition selector',
        unitPrice: 0,
        minStockLevel: 10,
        hsnCode: '000000',
        materialType: 'Other'
      });
      
      // Since it's a subscription, we need to find it by name in the next pulse or just wait
      // For UX, we'll try to guess it or just let the sub update it.
      toast.success('New material added to master inventory');
      setIsAddingNew(false);
      setNewName('');
      setOpen(false);
    } catch (error) {
      toast.error('Failed to add material');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 text-left font-normal", className)}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 overflow-hidden">
               <Package className="w-4 h-4 text-slate-400 shrink-0" />
               <span className="truncate">{formatMaterialName(selectedProduct.name)}</span>
            </div>
          ) : (
            <span className="text-slate-400">Select Material...</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex flex-col h-[400px]">
           <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search existing materials..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (isAddingNew) setIsAddingNew(false);
                  }}
                  className="pl-9 h-9"
                  autoFocus
                />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 min-h-[200px]">
              {isAddingNew ? (
                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2.5 rounded-sm border border-blue-100">
                      <Plus className="w-4 h-4" />
                      <p className="text-[10px] font-bold uppercase tracking-tight">New Material Entry</p>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] uppercase font-mono text-slate-400">Material Name</Label>
                     <Input 
                        placeholder="e.g. Cement OPC 53 Grade" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        className="h-9 focus:ring-blue-500"
                        autoFocus
                     />
                     <p className="text-[10px] text-slate-400 font-mono italic">
                       Registering this into Global Master Inventory.
                     </p>
                   </div>
                   <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleAddNew}>Register & Select</Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsAddingNew(false)}>Cancel</Button>
                   </div>
                </div>
              ) : (
                <div className="py-2">
                   {filteredProducts.length > 0 ? (
                      <div className="px-2 pb-2">
                         <p className="text-[10px] font-mono text-slate-400 uppercase px-2 mb-1">Master Inventory Suggestions</p>
                         <div className="space-y-0.5">
                           {filteredProducts.map((product) => (
                             <button
                               key={product.id}
                               onClick={() => {
                                 onSelect(product.id!);
                                 setOpen(false);
                               }}
                               className={cn(
                                 "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-all text-left group",
                                 selectedProductId === product.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                               )}
                             >
                               <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800 group-hover:text-blue-700">{formatMaterialName(product.name)} (Stock: {warehouseStocks[product.id] || 0})</span>
                                  <span className="text-[10px] text-slate-400 uppercase font-mono">{product.category} • {product.uom}</span>
                               </div>
                               {selectedProductId === product.id && <Check className="w-4 h-4 text-blue-600" />}
                             </button>
                           ))}
                         </div>
                      </div>
                   ) : (
                     <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                           <Package className="w-6 h-6 text-slate-200" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">No match found</p>
                        <p className="text-xs text-slate-500 italic mt-1 pb-4">Try a different search or add a new material.</p>
                     </div>
                   )}

                   {/* Add New Section */}
                   <div className="px-3 py-4 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
                      <Button 
                         variant="outline" 
                         className="w-full justify-start gap-3 h-11 border-dashed border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:bg-white transition-all group"
                         onClick={() => {
                            setNewName(search);
                            setIsAddingNew(true);
                         }}
                      >
                         <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                            <Plus className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col items-start">
                            <span className="text-xs font-bold">Add New Material</span>
                            {search && <span className="text-[10px] text-slate-400 italic font-normal">Create "{search}"</span>}
                         </div>
                      </Button>
                      
                      {similarProducts.length > 0 && !isAddingNew && (
                         <div className="mt-3 p-2.5 bg-amber-50 rounded-md border border-amber-100 animate-in fade-in zoom-in-95">
                            <p className="text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1.5 mb-1.5">
                               <AlertCircle className="w-3.5 h-3.5" /> Security Warning: Duplicates Detected
                            </p>
                            <div className="space-y-1.5">
                               {similarProducts.slice(0, 3).map(p => (
                                  <button 
                                     key={p.id}
                                     onClick={() => {
                                        onSelect(p.id!);
                                        setOpen(false);
                                     }}
                                     className="text-[10px] text-slate-600 hover:text-blue-700 bg-white/50 px-2 py-1 rounded border border-amber-200/50 block w-full text-left transition-colors"
                                  >
                                     Use <span className="font-bold">"{p.name}"</span> instead?
                                  </button>
                               ))}
                            </div>
                         </div>
                      )}
                   </div>
                </div>
              )}
           </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
