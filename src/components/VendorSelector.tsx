import React, { useState, useMemo } from 'react';
import { Vendor } from '@/types';
import { VendorService } from '@/services/store';
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
  Store, 
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VendorSelectorProps {
  vendors: Vendor[];
  selectedVendorId: string;
  onSelect: (vendorId: string) => void;
  className?: string;
}

export function VendorSelector({ 
  vendors, 
  selectedVendorId, 
  onSelect, 
  className 
}: VendorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // New Vendor Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGst, setNewGst] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const filteredVendors = useMemo(() => {
    if (!search) return vendors;
    const lowerSearch = search.toLowerCase();
    return vendors.filter(v => 
      v.name.toLowerCase().includes(lowerSearch) || 
      v.email.toLowerCase().includes(lowerSearch) ||
      v.phone.includes(search)
    );
  }, [vendors, search]);

  const similarVendors = useMemo(() => {
    if (!search || search.length < 3) return [];
    const lowerSearch = search.toLowerCase();
    return vendors.filter(v => {
       const lowerName = v.name.toLowerCase();
       return lowerName.includes(lowerSearch) || lowerSearch.includes(lowerName);
    });
  }, [vendors, search]);

  const handleAddNew = async () => {
    if (!newName.trim()) {
      toast.error('Vendor name is required');
      return;
    }
    
    const exactMatch = vendors.find(v => v.name.toLowerCase() === newName.trim().toLowerCase());
    if (exactMatch) {
      toast.error('Vendor already exists', {
        description: `Found: ${exactMatch.name}`
      });
      onSelect(exactMatch.id!);
      resetForm();
      setOpen(false);
      return;
    }

    try {
      const newId = await VendorService.add({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        gstNumber: newGst.trim(),
        address: newAddress.trim(),
        contactPerson: newName.trim(), // Default to name
        categories: ['General'],
        rating: 5,
        status: 'ACTIVE'
      });
      
      if (newId) {
        onSelect(newId);
      }
      
      toast.success('New vendor registered in Master List');
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error('Failed to add vendor');
    }
  };

  const resetForm = () => {
    setIsAddingNew(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewGst('');
    setNewAddress('');
  };

  return (
    <Popover open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 text-left font-normal", className)}
        >
          {selectedVendor ? (
            <div className="flex items-center gap-2 overflow-hidden">
               <Store className="w-4 h-4 text-slate-400 shrink-0" />
               <span className="truncate">{selectedVendor.name}</span>
            </div>
          ) : (
            <span className="text-slate-400">Select Vendor...</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <PopoverContent className="w-[450px] p-0" align="start">
        <div className="flex flex-col max-h-[550px]">
           <div className="p-3 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search vendor master list..."
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

           <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 min-h-[300px]">
              {isAddingNew ? (
                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2.5 rounded-sm border border-blue-100 flex-1">
                        <Plus className="w-4 h-4" />
                        <p className="text-[10px] font-bold uppercase tracking-tight">Register New Vendor</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase font-mono text-slate-400">Vendor Business Name *</Label>
                        <Input 
                            placeholder="e.g. Acme Construction Supplies" 
                            value={newName} 
                            onChange={e => setNewName(e.target.value)}
                            className="h-9 focus:ring-blue-500"
                            autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                           <Mail className="w-3 h-3" /> Email
                        </Label>
                        <Input 
                            type="email"
                            placeholder="vendor@example.com" 
                            value={newEmail} 
                            onChange={e => setNewEmail(e.target.value)}
                            className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                           <Phone className="w-3 h-3" /> Phone
                        </Label>
                        <Input 
                            placeholder="+91 9876543210" 
                            value={newPhone} 
                            onChange={e => setNewPhone(e.target.value)}
                            className="h-9"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                           <FileText className="w-3 h-3" /> GST Number
                        </Label>
                        <Input 
                            placeholder="22AAAAA0000A1Z5" 
                            value={newGst} 
                            onChange={e => setNewGst(e.target.value)}
                            className="h-9"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                           <MapPin className="w-3 h-3" /> Business Address
                        </Label>
                        <Input 
                            placeholder="Street address, City, PIN" 
                            value={newAddress} 
                            onChange={e => setNewAddress(e.target.value)}
                            className="h-9"
                        />
                      </div>
                   </div>

                   <p className="text-[10px] text-slate-400 font-mono italic">
                      New vendors are added to the Global Directory for all projects.
                   </p>

                   <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleAddNew}>Register Vendor</Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsAddingNew(false)}>Cancel</Button>
                   </div>
                </div>
              ) : (
                <div className="py-2">
                   {filteredVendors.length > 0 ? (
                      <div className="px-2 pb-2">
                         <p className="text-[10px] font-mono text-slate-400 uppercase px-2 mb-1">Available Vendors</p>
                         <div className="space-y-0.5">
                           {filteredVendors.map((vendor) => (
                             <button
                               key={vendor.id}
                               onClick={() => {
                                 onSelect(vendor.id!);
                                 setOpen(false);
                               }}
                               className={cn(
                                 "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-all text-left group",
                                 selectedVendorId === vendor.id ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                               )}
                             >
                               <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800 group-hover:text-blue-700">{vendor.name}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                     <span className="text-[10px] text-slate-400 uppercase font-mono">{vendor.phone}</span>
                                     <span className="text-slate-200">•</span>
                                     <span className="text-[10px] text-slate-400 lowercase font-mono">{vendor.email}</span>
                                  </div>
                               </div>
                               {selectedVendorId === vendor.id && <Check className="w-4 h-4 text-blue-600" />}
                             </button>
                           ))}
                         </div>
                      </div>
                   ) : (
                     <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                           <Store className="w-6 h-6 text-slate-200" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">No vendor found</p>
                        <p className="text-xs text-slate-500 italic mt-1 pb-4">Try searching by name, email or phone.</p>
                     </div>
                   )}

                   {/* Add New Section sticky at bottom */}
                   <div className="px-3 py-4 border-t border-slate-100 bg-slate-50/50 sticky bottom-0 z-10">
                      <Button 
                         variant="outline" 
                         className="w-full justify-start gap-3 h-12 border-dashed border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:bg-white transition-all group"
                         onClick={() => {
                            setNewName(search);
                            setIsAddingNew(true);
                         }}
                      >
                         <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                            <Plus className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col items-start">
                            <span className="text-xs font-bold">Register New Vendor</span>
                            {search && <span className="text-[10px] text-slate-400 italic font-normal">Add "{search}" to master list</span>}
                         </div>
                      </Button>
                      
                      {similarVendors.length > 0 && !isAddingNew && (
                         <div className="mt-3 p-2.5 bg-amber-50 rounded-md border border-amber-100 animate-in fade-in zoom-in-95">
                            <p className="text-[9px] font-bold text-amber-700 uppercase flex items-center gap-1.5 mb-1.5">
                               <AlertCircle className="w-3.5 h-3.5" /> Potential Duplicate Found
                            </p>
                            <div className="space-y-1.5">
                               {similarVendors.slice(0, 3).map(v => (
                                  <button 
                                     key={v.id}
                                     onClick={() => {
                                        onSelect(v.id!);
                                        setOpen(false);
                                     }}
                                     className="text-[10px] text-slate-600 hover:text-blue-700 bg-white/50 px-2 py-1 rounded border border-amber-200/50 block w-full text-left transition-colors"
                                  >
                                     Use existing <span className="font-bold">"{v.name}"</span>?
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
