import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaterialPriceHistoryService, ProjectService } from '@/services/store';
import { MaterialPriceHistoryRecord, Project } from '@/types';
import { formatMaterialName } from '@/lib/utils';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriceComparisonBadge } from '@/components/PriceComparisonBadge';
import { Search, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';

import { VendorIntelligenceDialog } from '@/components/VendorIntelligenceDialog';

export default function MaterialPriceHistoryPage() {
  const [history, setHistory] = useState<MaterialPriceHistoryRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterMaterial, setFilterMaterial] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = MaterialPriceHistoryService.subscribe((data) => {
      setHistory(data as MaterialPriceHistoryRecord[]);
      setLoading(false);
    });
    const unsubProjects = ProjectService.subscribe((data) => {
      setProjects(data);
    });
    return () => { unsub(); unsubProjects(); };
  }, []);

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId && projects.length > 0) {
      setFilterProject(projectId);
    }
  }, [searchParams, projects]);

  const materials = useMemo(() => Array.from(new Set(history.map(h => h.materialId))).map(id => {
    const record = history.find(h => h.materialId === id);
    return { id, name: record?.materialName || id };
  }), [history]);

  const vendors = useMemo(() => Array.from(new Set(history.map(h => h.vendorId))).map(id => {
    const record = history.find(h => h.vendorId === id);
    return { id, name: record?.vendorName || id };
  }), [history]);

  const filteredHistory = history.filter(h => {
    if (filterMaterial !== 'ALL' && h.materialId !== filterMaterial) return false;
    if (filterVendor !== 'ALL' && h.vendorId !== filterVendor) return false;
    if (filterProject !== 'ALL' && h.projectId !== filterProject) return false;
    if (filterDate && !h.purchaseDate.startsWith(filterDate)) return false;
    
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    return (
      (h.materialName && h.materialName.toLowerCase().includes(lowerQ)) ||
      (h.vendorName && h.vendorName.toLowerCase().includes(lowerQ)) ||
      (h.projectName && h.projectName.toLowerCase().includes(lowerQ)) ||
      (h.sku && h.sku.toLowerCase().includes(lowerQ)) ||
      (h.poNumber && h.poNumber.toLowerCase().includes(lowerQ)) ||
      (h.grnNumber && h.grnNumber.toLowerCase().includes(lowerQ))
    );
  }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  const exportCSV = () => {
    const headers = ['Date', 'Material', 'SKU', 'Vendor', 'Project', 'PO', 'GRN', 'Unit Price', 'Quantity', 'Total'];
    const rows = filteredHistory.map(h => [
      format(new Date(h.purchaseDate), 'dd MMM yyyy'),
      h.materialName,
      h.sku,
      h.vendorName,
      h.projectName,
      h.poNumber,
      h.grnNumber,
      h.unitPrice.toString(),
      h.quantity.toString(),
      h.totalAmount.toString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Material_Price_History.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Material Price History</h1>
          <p className="text-slate-500 text-sm">Review historic purchase prices and quantities.</p>
        </div>
        <div className="flex gap-2">
          <VendorIntelligenceDialog />
          <Button variant="outline" onClick={exportCSV}>
             <FileSpreadsheet className="w-4 h-4 mr-2" />
             Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search material, vendor, po, grn, sku..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-[180px]">
             <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMaterial} onValueChange={setFilterMaterial}>
          <SelectTrigger className="w-full sm:w-[180px]">
             <SelectValue placeholder="All Materials" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Materials</SelectItem>
            {materials.map(m => <SelectItem key={m.id} value={m.id}>{formatMaterialName(m.name)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterVendor} onValueChange={setFilterVendor}>
          <SelectTrigger className="w-full sm:w-[180px]">
             <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Vendors</SelectItem>
            {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input 
           type="date"
           value={filterDate}
           onChange={(e) => setFilterDate(e.target.value)}
           className="w-full sm:w-[160px]"
        />
        {filterDate && (
          <Button variant="ghost" onClick={() => setFilterDate('')} className="px-2">Clear Date</Button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Date</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Material</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Vendor</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Project</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">PO</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">GRN</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Unit Price</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Quantity</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">Loading history...</TableCell>
                </TableRow>
              ) : filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">No price history found.</TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((record) => (
                  <TableRow key={record.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">{format(new Date(record.purchaseDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                       <div className="font-semibold text-slate-900">{formatMaterialName(record.materialName)}</div>
                       <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{record.sku || 'No SKU'}</div>
                    </TableCell>
                    <TableCell className="text-slate-600">{record.vendorName}</TableCell>
                    <TableCell className="text-slate-600">{record.projectName}</TableCell>
                    <TableCell className="font-mono text-xs">{record.poNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{record.grnNumber}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                       ₹{record.unitPrice.toLocaleString()}
                       <PriceComparisonBadge materialId={record.materialId} currentPrice={record.unitPrice} />
                    </TableCell>
                    <TableCell className="text-right text-slate-600">{record.quantity}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900 italic">₹{record.totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
