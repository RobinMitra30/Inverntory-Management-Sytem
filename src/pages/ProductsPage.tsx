import React, { useState, useEffect } from 'react';
import { ProductService } from '@/services/store';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    sku: '',
    name: '',
    category: '',
    uom: 'Bags',
    lowStockThreshold: 10,
    description: '',
    unitPrice: 0
  });

  useEffect(() => {
    return ProductService.subscribe(setProducts);
  }, []);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ProductService.add(newProduct);
      setIsAddOpen(false);
      toast.success('Product added successfully');
      setNewProduct({
        sku: '',
        name: '',
        category: '',
        uom: 'Bags',
        lowStockThreshold: 10,
        description: '',
        unitPrice: 0
      });
    } catch (err) {
      console.error('Add Product Error:', err);
      toast.error('Failed to add product.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Product Catalog</h1>
          <p className="text-slate-500 text-sm">Manage construction materials and inventory parameters.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-orange-600 hover:bg-orange-700 h-10 gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Code</Label>
                  <Input id="sku" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} placeholder="e.g. CEM-OPC-53" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} placeholder="e.g. Cement" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Full descriptive name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="uom">UOM</Label>
                  <Input id="uom" value={newProduct.uom} onChange={e => setNewProduct({...newProduct, uom: e.target.value})} placeholder="e.g. Bags, Kg, Mtr" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStock">Alert Threshold</Label>
                  <Input id="lowStock" type="number" value={isNaN(newProduct.lowStockThreshold) ? '' : newProduct.lowStockThreshold} onChange={e => setNewProduct({...newProduct, lowStockThreshold: e.target.value === '' ? 0 : Number(e.target.value)})} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Standard Price</Label>
                <Input id="price" type="number" value={isNaN(newProduct.unitPrice) ? '' : newProduct.unitPrice} onChange={e => setNewProduct({...newProduct, unitPrice: e.target.value === '' ? 0 : Number(e.target.value)})} required />
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">Create Product</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filter by SKU or name..." 
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Total items: {filtered.length}
            </div>
          </div>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="font-mono uppercase text-[10px] tracking-widest italic">
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-sm font-sans">
              {filtered.map((product) => (
                <TableRow key={product.id} className="hover:bg-slate-50 group">
                  <TableCell className="font-mono text-slate-600 text-xs">{product.sku}</TableCell>
                  <TableCell className="font-medium text-slate-900">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="font-mono text-xs">{product.uom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{product.lowStockThreshold}</span>
                      <AlertCircle className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit2 className="h-4 w-4 text-slate-400 hover:text-orange-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic font-serif">
                    No products found in catalog.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
