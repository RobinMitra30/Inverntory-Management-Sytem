import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileSpreadsheet,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types';
import { ProductService, CatalogImportService } from '@/services/store';
import { Search } from 'lucide-react';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProducts: Product[];
  currentUser?: { uid: string; name: string };
}

interface ValidationError {
  row: number;
  errors: string[];
}

export function BulkUploadDialog({ open, onOpenChange, existingProducts, currentUser }: BulkUploadDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'summary' | 'history'>('upload');
  const [history, setHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState({ success: 0, failed: 0, total: 0 });
  const [failedRows, setFailedRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ROWS = 1000;

  useEffect(() => {
    if (open) {
      return CatalogImportService.subscribe(setHistory);
    }
  }, [open]);

  const TEMPLATE_HEADERS = [
    'Product Name',
    'Category',
    'Subcategory',
    'Unit',
    'Size / Specification',
    'SKU Code',
    'HSN Code',
    'Material Type',
    'Stock Quantity',
    'Minimum Stock Alert'
  ];

  const SAMPLE_DATA = [
    ['Copper Wire 1.5mm', 'Electrical', 'Wires', 'Mtr', '1.5mm flexible', 'CW-150', '8544', 'Copper', '100', '20'],
    ['PVC Pipe 25mm', 'Plumbing', 'Pipes', 'Mtr', '25mm rigid', 'PVC-25', '3917', 'PVC', '50', '10'],
    ['TMT Bar 12mm', 'Steel', 'Reinforcement', 'Kg', '12mm Fe500D', 'TMT-12', '7214', 'Steel', '500', '100'],
    ['MDF Board 18mm', 'Carpentry', 'Sheets', 'Sft', '18mm water resistant', 'MDF-18', '4411', 'Wood', '20', '5']
  ];

  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...SAMPLE_DATA]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'product_import_template.xlsx');
    } else {
      XLSX.writeFile(wb, 'product_import_template.csv');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        if (rawData.length === 0) {
          toast.error('The uploaded file is empty.');
          return;
        }

        if (rawData.length > MAX_ROWS) {
          toast.error(`File too large. Maximum ${MAX_ROWS} rows allowed.`);
          return;
        }

        processFileData(rawData, file.name);
      } catch (err) {
        toast.error('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processFileData = async (rawRows: any[], nameOfFile: string) => {
    setIsValidating(true);
    setFileName(nameOfFile);
    setStep('preview');
    
    const errors: ValidationError[] = [];
    const validRows: any[] = [];
    const existingSkus = new Set(existingProducts.map(p => p.sku.toLowerCase()));
    const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase().trim()));

    rawRows.forEach((row, index) => {
      const rowErrors: string[] = [];
      const rowNum = index + 2; // +1 for 0-index, +1 for header row

      // Map spreadsheet columns to our fields
      const name = String(row['Product Name'] || '').trim();
      const category = String(row['Category'] || '').trim();
      const uom = String(row['Unit'] || '').trim();
      const sku = String(row['SKU Code'] || '').trim();

      if (!name) rowErrors.push('Product Name is required');
      if (!category) rowErrors.push('Category is required');
      if (!uom) rowErrors.push('Unit (UOM) is required');

      // Check for duplicates in existing catalog
      if (name && existingNames.has(name.toLowerCase())) {
        rowErrors.push(`Duplicate Name: "${name}" already exists in catalog`);
      }
      if (sku && existingSkus.has(sku.toLowerCase())) {
        rowErrors.push(`Duplicate SKU: "${sku}" already exists in catalog`);
      }

      // Check for duplicates within the file itself
      const currentNamesInFile = rawRows.slice(0, index).map(r => String(r['Product Name'] || '').trim().toLowerCase());
      if (name && currentNamesInFile.includes(name.toLowerCase())) {
        rowErrors.push(`Duplicate row: "${name}" appears multiple times in file`);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors });
      }
    });

    setValidationErrors(errors);
    setFileData(rawRows);
    setIsValidating(false);
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    
    const productsToAdd: Omit<Product, 'id'>[] = [];
    const errorRows: any[] = [];
    let successCount = 0;

    // Filter out rows with validation errors for the final import
    const errorRowIndices = new Set(validationErrors.map(e => e.row));

    const rowsToProcess = fileData.filter((_, idx) => !errorRowIndices.has(idx + 2));

    for (let i = 0; i < rowsToProcess.length; i++) {
        const row = rowsToProcess[i];
        
        // Auto SKU generation if empty
        let sku = String(row['SKU Code'] || '').trim();
        if (!sku) {
            const name = String(row['Product Name'] || '').trim();
            sku = `AUTO-${name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // Auto category mapping / normalization
        const rawCategory = String(row['Category'] || '').trim();
        const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();

        productsToAdd.push({
            name: String(row['Product Name'] || '').trim(),
            category: category,
            subcategory: String(row['Subcategory'] || '').trim(),
            uom: String(row['Unit'] || '').trim(),
            sku: sku,
            hsnCode: String(row['HSN Code'] || '').trim(),
            materialType: String(row['Material Type'] || '').trim() || 'Other',
            description: String(row['Size / Specification'] || '').trim(),
            minStockLevel: Number(row['Minimum Stock Alert']) || 10,
            unitPrice: 0
        });

        // Batch add in chunks of 50 to show progress
        if (productsToAdd.length >= 50 || i === rowsToProcess.length - 1) {
            try {
                await ProductService.batchAdd(productsToAdd);
                successCount += productsToAdd.length;
                productsToAdd.length = 0;
            } catch (err) {
                console.error('Batch import chunk failed', err);
                errorRows.push(...productsToAdd);
                productsToAdd.length = 0;
            }
        }
        
        setProgress(Math.round(((i + 1) / rowsToProcess.length) * 100));
    }

    setSummary({
        success: successCount,
        failed: errorRows.length + validationErrors.length,
        total: fileData.length
    });

    await CatalogImportService.add({
        userId: currentUser?.uid || 'anonymous',
        userName: currentUser?.name || 'System User',
        fileName: fileName,
        totalRows: fileData.length,
        successCount: successCount,
        failedCount: errorRows.length + validationErrors.length,
        status: 'COMPLETED'
    });

    setFailedRows([...errorRows, ...validationErrors]);
    setStep('summary');
  };

  const reset = () => {
    setStep('upload');
    setFileData([]);
    setValidationErrors([]);
    setProgress(0);
    setFailedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportFailedRows = () => {
    if (validationErrors.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(validationErrors.map(e => ({
        Row: e.row,
        Errors: e.errors.join(', ')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows');
    XLSX.writeFile(wb, 'import_errors.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (step === 'importing') return;
        onOpenChange(val);
        if (!val) setTimeout(reset, 300);
    }}>
      <DialogContent className={step === 'preview' ? 'max-w-4xl max-h-[90vh]' : 'max-w-lg'}>
        <DialogHeader>
          <div className="flex justify-between items-center pr-8">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              {step === 'upload' && 'Bulk Product Upload'}
              {step === 'preview' && 'Import Preview & Validation'}
              {step === 'importing' && 'Importing Products...'}
              {step === 'summary' && 'Import Summary'}
              {step === 'history' && 'Import History'}
            </DialogTitle>
            {step !== 'importing' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep(step === 'history' ? 'upload' : 'history')}
                className="text-xs font-mono"
              >
                {step === 'history' ? 'Back to Upload' : 'View History'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {step === 'history' && (
          <div className="space-y-4 py-4 min-h-[400px] flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search history by file name..." 
                className="pl-9 h-9"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
              />
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Success/Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history
                    .filter(h => h.fileName?.toLowerCase().includes(historySearch.toLowerCase()))
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((h, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-xs truncate max-w-[150px]">{h.fileName}</TableCell>
                      <TableCell className="text-[10px] text-slate-500">{new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="text-green-600 font-bold">{h.successCount}</span>/{h.totalRows}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-slate-400 italic">No history found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')} className="w-full">Back to Upload</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-10 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                 onClick={() => fileInputRef.current?.click()}>
              <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-500 mt-1">Excel (.xlsx) or CSV (.csv) up to 10MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Useful Resources</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start gap-2 h-12" onClick={() => downloadTemplate('xlsx')}>
                  <Download className="w-4 h-4" /> 
                  <div className="text-left">
                    <div className="text-sm">Excel Template</div>
                    <div className="text-[10px] text-slate-500">.xlsx format</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start gap-2 h-12" onClick={() => downloadTemplate('csv')}>
                  <Download className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm">CSV Template</div>
                    <div className="text-[10px] text-slate-500">.csv format</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-orange-50 p-4 border border-orange-100">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                    <div className="text-xs text-orange-800 leading-relaxed">
                        <span className="font-bold">Important labels:</span> Ensure your file headers match the template exactly. Duplicate SKUs or Names will be flagged during validation.
                    </div>
                </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
                        Total Rows: {fileData.length}
                    </div>
                    <div className="bg-red-100 px-3 py-1 rounded-full text-xs font-medium text-red-600 border border-red-200">
                        Errors: {validationErrors.length}
                    </div>
                </div>
                {validationErrors.length > 0 && (
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-red-600 border-red-200" onClick={() => setValidationErrors([])}>
                        <Trash2 className="w-3.5 h-3.5" /> Clear All Errors
                    </Button>
                )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileData.map((row, idx) => {
                    const rowNum = idx + 2;
                    const error = validationErrors.find(e => e.row === rowNum);
                    return (
                      <TableRow key={idx} className={error ? 'bg-red-50/50' : ''}>
                        <TableCell className="text-xs text-slate-500">#{rowNum}</TableCell>
                        <TableCell>
                          {error ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{row['Product Name']}</TableCell>
                        <TableCell className="font-mono text-[10px]">{row['SKU Code'] || '(Auto-gen)'}</TableCell>
                        <TableCell className="text-[10px] text-red-600">
                          {error?.errors.join('; ')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={reset}>Cancel & Restart</Button>
              <Button 
                onClick={handleImport} 
                disabled={fileData.length === 0 || validationErrors.length === fileData.length}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {validationErrors.length > 0 
                    ? `Import ${fileData.length - validationErrors.length} Valid Rows` 
                    : 'Confirm & Import All'
                }
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6 py-10 flex flex-col items-center">
            <div className="w-full max-w-xs space-y-4">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>{progress}% Completed</span>
                <span>Please do not close this window</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 animate-pulse italic">
                Processing data and updating catalog...
            </p>
          </div>
        )}

        {step === 'summary' && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center py-6">
                <div className="bg-green-100 p-3 rounded-full mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Import Process Finished</h3>
                <p className="text-sm text-slate-500">Your master catalog has been updated.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{summary.total}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Total Rows</div>
                </div>
                <div className="text-center border-x border-slate-200">
                    <div className="text-2xl font-bold text-green-600">{summary.success}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Success</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Failed</div>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs font-medium text-slate-700">Need to fix failed rows?</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-orange-600" onClick={exportFailedRows} disabled={summary.failed === 0}>
                    <Download className="w-3 h-3" /> Export Logs
                </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">Done, Close Window</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
