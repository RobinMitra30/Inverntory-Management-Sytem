import React, { useState, useEffect } from 'react';
import { ProductService } from '@/services/store';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { PriceComparisonBadge } from '@/components/PriceComparisonBadge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, AlertCircle, Upload, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { masterCatalog } from '@/data/product-catalog';

import { BulkUploadDialog } from '@/components/BulkUploadDialog';
import { useAuth } from '@/lib/auth-context';

import { VendorIntelligenceDialog } from '@/components/VendorIntelligenceDialog';

export default function ProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    sku: '',
    name: '',
    category: '',
    subcategory: '',
    uom: 'Bags',
    minStockLevel: 10,
    description: '',
    unitPrice: 0,
    hsnCode: '',
    materialType: 'Other'
  });

  useEffect(() => {
    return ProductService.subscribe(setProducts);
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis1');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis2');
      }
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

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
        subcategory: '',
        uom: 'Bags',
        minStockLevel: 10,
        description: '',
        unitPrice: 0,
        hsnCode: '',
        materialType: 'Other'
      });
    } catch (err) {
      console.error('Add Product Error:', err);
      toast.error('Failed to add product.');
    }
  };

  const handleDeduplicate = async () => {
    try {
        toast.info('Finding duplicates...');
        const nameMap = new Map<string, string[]>();
        
        products.forEach(p => {
            const name = p.name.toLowerCase().trim();
            if (!nameMap.has(name)) {
                nameMap.set(name, []);
            }
            nameMap.get(name)?.push(p.id);
        });

        const idsToDelete: string[] = [];
        nameMap.forEach((ids) => {
            if (ids.length > 1) {
                // Keep the first one, delete the rest
                idsToDelete.push(...ids.slice(1));
            }
        });

        if (idsToDelete.length === 0) {
            toast.success('No duplicates found.');
            return;
        }

        toast.info(`Deleting ${idsToDelete.length} duplicates...`);
        // Batch delete in chunks of 500 (Firestore limit)
        for (let i = 0; i < idsToDelete.length; i += 500) {
            const chunk = idsToDelete.slice(i, i + 500);
            await ProductService.batchDelete(chunk);
        }
        
        toast.success('Duplicates removed successfully');
    } catch (err) {
        console.error('Deduplicate Error:', err);
        toast.error('Failed to remove duplicates');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await ProductService.delete(id);
      toast.success('Product deleted');
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      <BulkUploadDialog 
        open={isBulkOpen} 
        onOpenChange={setIsBulkOpen} 
        existingProducts={products} 
        currentUser={profile ? { uid: profile.uid, name: profile.name } : undefined}
      />
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Product Catalog</h1>
          <p className="text-slate-500 text-sm">Manage construction materials and inventory parameters.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 gap-2 border-slate-200" onClick={() => setIsBulkOpen(true)}>
            <Download className="w-4 h-4 text-slate-500" /> Download Sample File
          </Button>

          <Button variant="outline" className="h-10 gap-2 border-slate-200" onClick={() => setIsBulkOpen(true)}>
            <Upload className="w-4 h-4" /> Upload Bulk Products
          </Button>

          <Button variant="outline" className="h-10 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleDeduplicate} title="Remove duplicate product names">
            <Trash2 className="w-4 h-4" /> Deduplicate
          </Button>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU / Code</Label>
                    <Input id="sku" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} placeholder="e.g. CEM-OPC-53" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} placeholder="e.g. Cement" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Sub-category</Label>
                    <Input id="subcategory" value={newProduct.subcategory} onChange={e => setNewProduct({...newProduct, subcategory: e.target.value})} placeholder="e.g. Cables" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="materialType">Material Type</Label>
                    <Input id="materialType" value={newProduct.materialType} onChange={e => setNewProduct({...newProduct, materialType: e.target.value})} placeholder="e.g. Copper" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Full descriptive name" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="uom">UOM</Label>
                    <Input id="uom" value={newProduct.uom} onChange={e => setNewProduct({...newProduct, uom: e.target.value})} placeholder="e.g. Bags, Kg, Mtr" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Min Stock Level</Label>
                    <Input id="minStock" type="number" value={isNaN(newProduct.minStockLevel) ? '' : newProduct.minStockLevel} onChange={e => setNewProduct({...newProduct, minStockLevel: e.target.value === '' ? 0 : Number(e.target.value)})} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Standard Price</Label>
                    <Input id="price" type="number" value={isNaN(newProduct.unitPrice) ? '' : newProduct.unitPrice} onChange={e => setNewProduct({...newProduct, unitPrice: e.target.value === '' ? 0 : Number(e.target.value)})} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hsn">HSN Code</Label>
                    <Input id="hsn" value={newProduct.hsnCode} onChange={e => setNewProduct({...newProduct, hsnCode: e.target.value})} placeholder="HSN/SAC" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">Create Product</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border-none rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filter by SKU or name..." 
                className="pl-9 h-12 rounded-2xl bg-slate-50/50 border-slate-100"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total items: {filtered.length}
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <div className="hidden md:block min-w-full">
            <Table compact>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100">
                <TableHead className="py-4 pl-8 font-bold text-slate-900">SKU / CODE</TableHead>
                <TableHead className="font-bold text-slate-900">PRODUCT NAME</TableHead>
                <TableHead className="font-bold text-slate-900">CATEGORY</TableHead>
                <TableHead className="font-bold text-slate-900">UOM</TableHead>
                <TableHead className="font-bold text-slate-900 text-right">STANDARD PRICE</TableHead>
                <TableHead className="font-bold text-slate-900 text-right">THRESHOLD</TableHead>
                <TableHead className="text-right pr-8 font-bold text-slate-900">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="py-4 pl-8 font-mono text-xs text-slate-500">{product.sku}</TableCell>
                  <TableCell className="font-bold text-slate-900">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[10px] uppercase">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500 uppercase">{product.uom}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    ₹{product.unitPrice.toLocaleString()}
                    <PriceComparisonBadge materialId={product.id} currentPrice={product.unitPrice} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-slate-900 font-bold">{product.minStockLevel}</span>
                      <AlertCircle className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-2">
                      <VendorIntelligenceDialog initialMaterialId={product.id} />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-orange-600 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic font-medium">
                    No products found in catalog.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col p-4 gap-4 bg-slate-50">
            {paginatedProducts.map((product) => (
              <div key={product.id} className="bg-white border text-sm border-slate-100 p-4 flex flex-col gap-3 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900">{product.name}</p>
                    <p className="font-mono text-[10px] text-slate-500 mt-1">{product.sku}</p>
                  </div>
                  <Badge variant="outline" className="rounded-full border-slate-200 font-bold text-[9px] uppercase">{product.category}</Badge>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">UOM</span>
                    <span className="font-mono text-xs text-slate-600 uppercase">{product.uom}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Min Stock</span>
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-mono text-xs text-slate-900 font-bold">{product.minStockLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" className="h-8 shadow-sm rounded-lg hover:border-orange-200 hover:text-orange-600 bg-white" title="Edit">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 shadow-sm rounded-lg hover:border-red-200 hover:text-red-600 bg-white" onClick={() => handleDelete(product.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="h-32 flex items-center justify-center text-slate-400 italic">No products found in catalog.</div>
            )}
          </div>
          </div>
          {totalPages > 1 && (
            <div className="p-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl px-4 font-bold border-slate-200 bg-white hover:bg-slate-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => {
                    if (typeof page === 'string') {
                      return <span key={`ellipse-${index}`} className="text-slate-400 px-2">...</span>;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        className={`h-10 w-10 p-0 rounded-xl font-bold transition-all ${
                          currentPage === page ? "bg-primary shadow-sm text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl px-4 font-bold border-slate-200 bg-white hover:bg-slate-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
