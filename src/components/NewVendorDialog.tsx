import React, { useState } from 'react';
import { VendorService } from '@/services/store';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';

export function NewVendorDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Vendor name is required');
      return;
    }
    setLoading(true);
    try {
      await VendorService.add({
        name,
        email,
        phone,
        gstNumber,
        address,
        rating: 5,
        categories: [],
        status: 'ACTIVE',
        contactPerson: name
      });
      toast.success('Vendor registered successfully');
      setOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setGstNumber('');
      setAddress('');
    } catch (error) {
      toast.error('Failed to register vendor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ className: "bg-orange-600 hover:bg-orange-700" }))}>
           <Truck className="w-4 h-4 mr-2" />
           Add Vendor
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register New Vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Vendor Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendor@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" />
          </div>
           <div className="space-y-2">
            <Label>GST Number</Label>
            <Input value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="12345ABCDE" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Street, City" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>Register</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
