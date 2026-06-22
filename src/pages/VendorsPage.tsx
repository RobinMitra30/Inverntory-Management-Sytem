import React, { useState, useEffect } from 'react';
import { VendorService } from '@/services/store';
import { Vendor } from '@/types';
import { NewVendorDialog } from '@/components/NewVendorDialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Truck, Star, Mail, Phone, Plus } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    return VendorService.subscribe(setVendors);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Vendor Directory</h1>
          <p className="text-slate-500 text-sm">Approved suppliers and quality ratings.</p>
        </div>
        <NewVendorDialog />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <div className="hidden md:block min-w-full">
            <Table compact>
              <TableHeader>
                <TableRow className="text-[10px] font-mono uppercase tracking-widest italic bg-slate-50">
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-sm">
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-bold text-slate-900">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-orange-600" />
                         </div>
                         {vendor.name}
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="space-y-1">
                          <p className="flex items-center gap-2 text-xs text-slate-600"><Mail className="w-3 h-3" /> {vendor.email}</p>
                          <p className="flex items-center gap-2 text-xs text-slate-600"><Phone className="w-3 h-3" /> {vendor.phone || 'N/A'}</p>
                       </div>
                    </TableCell>
                    <TableCell>
                       <span className="font-mono text-xs text-slate-500">{vendor.gstNumber || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                       <span className="text-xs text-slate-500 max-w-[200px] truncate block" title={vendor.address}>{vendor.address || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                       <div className="flex gap-1 flex-wrap">
                          {vendor.categories?.map(c => <Badge key={c} variant="outline" className="text-[9px] uppercase px-1 h-4">{c}</Badge>)}
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-mono text-xs">{vendor.rating || '4.5'}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 border-green-200 uppercase text-[9px]">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 italic">No vendors registered.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="bg-white border text-sm border-slate-100 p-4 flex flex-col gap-3 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{vendor.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-mono text-[10px] text-slate-500">{vendor.rating || '4.5'}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 uppercase text-[9px]">Active</Badge>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2 mt-1">
                  <p className="flex items-center gap-2 text-xs text-slate-600"><Mail className="w-3 h-3 text-slate-400" /> {vendor.email}</p>
                  <p className="flex items-center gap-2 text-xs text-slate-600"><Phone className="w-3 h-3 text-slate-400" /> {vendor.phone || 'N/A'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">GST Number</span>
                  <span className="font-mono text-xs text-slate-600">{vendor.gstNumber || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Address</span>
                  <span className="text-xs text-slate-600">{vendor.address || 'N/A'}</span>
                </div>
                {vendor.categories && vendor.categories.length > 0 && (
                   <div className="flex gap-1 flex-wrap mt-1">
                     {vendor.categories.map(c => <Badge key={c} variant="outline" className="text-[9px] uppercase px-2 py-0 h-5 border-slate-200 text-slate-600">{c}</Badge>)}
                   </div>
                )}
              </div>
            ))}
            {vendors.length === 0 && (
              <div className="h-32 flex items-center justify-center text-slate-400 italic">No vendors registered.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
