import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, FileText, Plus, Trash2, Printer, Download } from 'lucide-react';
import { Project, Product, Stock } from '@/types';
import { ProjectService, ProductService, ProgressService, InventoryService } from '@/services/store';
import { MaterialSelector } from '@/components/MaterialSelector';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function DailyReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const unsubProducts = ProductService.subscribe(setProducts);
    const unsubStocks = InventoryService.subscribe(setStocks);
    let unsubProject = () => {};
    if (id) {
       unsubProject = ProjectService.subscribe(projects => {
          setProject(projects.find(p => p.id === id) || null);
       });
    }
    return () => {
      unsubProducts();
      unsubStocks();
      unsubProject();
    }
  }, [id]);

  const [stockRows, setStockRows] = useState([{ id: 1, productId: '', received: 0, stock: 0, used: 0, balance: 0 }]);
  const [workRows, setWorkRows] = useState([{ id: 1, type: '', total: 0, unit: 'Sqft', today: 0, balance: 0, progress: 0, drawing: 'No' }]);
  const [workerRows, setWorkerRows] = useState([{ id: 1, type: '', contractor: '', skilled: 0, unskilled: 0, required: 0 }]);
  const [timelineRows, setTimelineRows] = useState([{ id: 1, type: '', start: '', end: '', remark: '' }]);

  const [siteIncharge, setSiteIncharge] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [issues, setIssues] = useState('');
  const [signature, setSignature] = useState('');

  const addRow = <T extends { id: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>, emptyRow: Omit<T, 'id'>, rows: T[]) => setter([...rows, { ...emptyRow, id: rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1 } as unknown as T]);
  
  const removeRow = <T extends { id: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>, idToRemove: number, rows: T[]) => setter(rows.filter(r => r.id !== idToRemove));

  const handleSubmit = async () => {
    if (!id || !user || !project) return;
    
    // Validations
    const invalidStock = stockRows.some(r => !r.productId && (r.received > 0 || r.used > 0));
    if (invalidStock) {
        toast.error("Please select a material before entering stock quantities.");
        return;
    }
    const emptyWork = workRows.some(r => (r.today > 0 || r.total > 0) && !r.type);
    if (emptyWork) {
        toast.error("Work type is mandatory if quantities are entered.");
        return;
    }

    try {
        setIsSubmitting(true);
        
        // 1. Adjust Inventory for each row modified
        for(const row of stockRows.filter(r => r.productId && (r.used > 0 || r.received > 0))) {
            await InventoryService.adjustStock({
                productId: row.productId,
                projectId: id,
                newQuantity: row.balance,
                userId: user.uid,
                remarks: `Daily Report: Received ${row.received}, Used ${row.used}`
            });
        }
        
        // 2. Add full Daily Report to database
        await ProgressService.add({
           projectId: id,
           projectName: project.name,
           siteInchargeName: siteIncharge,
           date: reportDate,
           supervisorId: user.uid,
           supervisorName: user.displayName || user.email || 'Supervisor',
           stockDetails: stockRows.filter(r => r.productId).map(r => ({
              productId: r.productId,
              receivedQuantity: r.received,
              usedQuantity: r.used,
              remainingBalance: r.balance
           })),
           workDetails: workRows.filter(r => r.type).map(r => ({
              workType: r.type,
              totalWork: r.total,
              unitOfWork: r.unit,
              todayWork: r.today,
              balanceWork: r.balance,
              progressPercent: r.progress,
              drawingReceived: r.drawing === 'Yes'
           })),
           workTimelines: timelineRows.filter(r => r.type).map(r => ({
              workType: r.type,
              startDate: r.start,
              endDate: r.end,
              remark: r.remark
           })),
           workerDetails: workerRows.filter(r => r.type).map(r => ({
              workType: r.type,
              contractorName: r.contractor,
              skilledWorkers: r.skilled,
              nonSkilledWorkers: r.unskilled,
              requiredWorkers: r.required
           })),
           issues: issues,
           photoUrls: [], 
           signature: signature,
           status: 'SUBMITTED'
        });

        toast.success("Daily report submitted successfully");
        navigate(`/projects/${id}/daily-reports-list`);
    } catch (e) {
        console.error("Failed to submit daily report", e);
        toast.error("Failed to submit daily report");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <Button variant="ghost" onClick={() => navigate(`/projects/${id}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
        <h1 className="text-2xl font-bold">Daily Site Report</h1>
        <div className="flex gap-2">
            <Button variant="outline"><Save className="w-4 h-4 mr-2"/> Save Draft</Button>
            <Button className="bg-blue-600" onClick={handleSubmit} disabled={isSubmitting}>
              <FileText className="w-4 h-4 mr-2"/> {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
            <Button variant="secondary"><Download className="w-4 h-4 mr-2"/> Export PDF</Button>
            <Button variant="secondary"><Printer className="w-4 h-4 mr-2"/> Print</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Site Name</Label>
            <Input 
              placeholder="Site Name" 
              value={project?.name || ''} 
              readOnly 
              className="bg-slate-50 cursor-not-allowed"
            />
          </div>
          <div><Label>Site Incharge Name</Label><Input placeholder="Name" value={siteIncharge} onChange={e => setSiteIncharge(e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} /></div>
        </CardContent>
      </Card>

      {/* Stock Detail */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Detail</CardTitle>
          <Button size="sm" onClick={() => addRow(setStockRows, { productId: '', received: 0, stock: 0, used: 0, balance: 0 }, stockRows)}><Plus className="w-4 h-4 mr-2"/> Add</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse border border-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr>
                  <th className="border p-2 text-left w-[300px]">Material</th>
                  <th className="border p-2 text-right">Received</th>
                  <th className="border p-2 text-right">Stock</th>
                  <th className="border p-2 text-right">Used</th>
                  <th className="border p-2 text-right">Balance</th>
                  <th className="border p-2 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map(row => (
                  <tr key={row.id}>
                    <td className="border p-2">
                       <MaterialSelector 
                         products={products}
                         selectedProductId={row.productId}
                         onSelect={(pid) => {
                           const currentStock = stocks.find(s => s.productId === pid && s.projectId === id)?.quantity || 0;
                           setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, productId: pid, stock: currentStock, balance: (currentStock + r.received) - r.used } : r));
                         }}
                       />
                    </td>
                    <td className="border p-2"><Input type="number" className="text-right" value={row.received || ''} onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, received: val, balance: (r.stock + val) - r.used } : r))
                    }} /></td>
                    <td className="border p-2"><Input type="number" className="text-right bg-slate-50" value={row.stock || ''} onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, stock: val, balance: (val + r.received) - r.used } : r))
                    }} placeholder="Current Stock" /></td>
                    <td className="border p-2"><Input type="number" className="text-right" value={row.used || ''} onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, used: val, balance: (r.stock + r.received) - val } : r))
                    }} /></td>
                    <td className="border p-2"><Input type="number" className="text-right bg-slate-50 cursor-not-allowed" value={row.balance} readOnly /></td>
                    <td className="border p-2 text-center">
                       <Button variant="ghost" size="icon" className="text-red-500 w-8 h-8" onClick={() => removeRow(setStockRows, row.id, stockRows)}>
                         <Trash2 className="w-4 h-4"/>
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Work Detail */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Work Detail</CardTitle>
          <Button size="sm" onClick={() => addRow(setWorkRows, { type: '', total: 0, unit: 'Sqft', today: 0, balance: 0, progress: 0, drawing: 'No' }, workRows)}><Plus className="w-4 h-4 mr-2"/> Add</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <table className="w-full border-collapse border border-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr>
                  <th className="border p-2 text-left">Work Type</th>
                  <th className="border p-2 text-right">Total Work</th>
                  <th className="border p-2 text-left">Unit of Work</th>
                  <th className="border p-2 text-right">Today's Work Completed</th>
                  <th className="border p-2 text-right">Total Remaining Work</th>
                  <th className="border p-2 text-center w-[120px]">Progress</th>
                  <th className="border p-2 text-center">Drawing</th>
                  <th className="border p-2 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {workRows.map(row => (
                  <tr key={row.id}>
                    <td className="border p-2"><Input value={row.type} onChange={e => setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, type: e.target.value } : r))} /></td>
                    <td className="border p-2"><Input type="number" className="text-right" value={row.total || ''} onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const td = row.today;
                        let bal = val - td;
                        let prog = val > 0 ? (td / val) * 100 : 0;
                        if (val < td) {
                          prog = 100;
                          bal = 0;
                        }
                        setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, total: val, balance: bal, progress: Math.min(prog, 100) } : r))
                    }} /></td>
                    <td className="border p-2">
                       <select 
                          className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={row.unit} 
                          onChange={e => setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, unit: e.target.value } : r))}
                       >
                         {['Sqft', 'Meter', 'Length', 'Running Feet', 'Nos', 'KG', 'Cubic Feet'].map(u => (
                            <option key={u} value={u}>{u}</option>
                         ))}
                       </select>
                    </td>
                    <td className="border p-2"><Input type="number" className="text-right" value={row.today || ''} onChange={e => {
                        let val = parseFloat(e.target.value) || 0;
                        if (row.total > 0 && val > row.total) { // Validation rule
                           val = row.total;
                        }
                        const bal = row.total - val;
                        const prog = row.total > 0 ? (val / row.total) * 100 : 0;
                        setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, today: val, balance: bal, progress: prog } : r))
                    }} /></td>
                    <td className="border p-2">
                       <Input type="number" className="text-right bg-slate-50 cursor-not-allowed" value={row.balance} readOnly />
                    </td>
                    <td className="border p-2 text-center">
                       <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-xs">{row.progress.toFixed(1)}%</span>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                             <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${row.progress}%` }}></div>
                          </div>
                       </div>
                    </td>
                    <td className="border p-2">
                       <select className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" value={row.drawing} onChange={e => setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, drawing: e.target.value } : r))}>
                          <option>Yes</option><option>No</option>
                       </select>
                    </td>
                    <td className="border p-2 text-center">
                       <Button variant="ghost" size="icon" className="text-red-500 w-8 h-8" onClick={() => removeRow(setWorkRows, row.id, workRows)}>
                         <Trash2 className="w-4 h-4"/>
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Work Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Work Timeline</CardTitle>
          <Button size="sm" onClick={() => addRow(setTimelineRows, { type: '', start: '', end: '', remark: '' }, timelineRows)}><Plus className="w-4 h-4 mr-2"/> Add</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-200 text-sm">
            <thead className="bg-slate-100">
               <tr>
                 <th className="border p-2 text-left">Work Item</th>
                 <th className="border p-2 text-left">Start Date</th>
                 <th className="border p-2 text-left">Approx End Date</th>
                 <th className="border p-2 text-left">Remark</th>
                 <th className="border p-2 w-[50px]"></th>
               </tr>
            </thead>
            <tbody>
               {timelineRows.map(row => (
                 <tr key={row.id}>
                    <td className="border p-2"><Input value={row.type} onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, type: e.target.value } : r))} /></td>
                    <td className="border p-2"><Input type="date" value={row.start} onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, start: e.target.value } : r))} /></td>
                    <td className="border p-2"><Input type="date" value={row.end} onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, end: e.target.value } : r))} /></td>
                    <td className="border p-2"><Input value={row.remark} onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, remark: e.target.value } : r))} /></td>
                    <td className="border p-2 text-center">
                       <Button variant="ghost" size="icon" className="text-red-500 w-8 h-8" onClick={() => removeRow(setTimelineRows, row.id, timelineRows)}>
                         <Trash2 className="w-4 h-4"/>
                       </Button>
                    </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Worker Detail */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Worker Detail</CardTitle>
          <Button size="sm" onClick={() => addRow(setWorkerRows, { type: '', contractor: '', skilled: 0, unskilled: 0, required: 0 }, workerRows)}><Plus className="w-4 h-4 mr-2"/> Add</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Contractor Name</th>
                <th className="border p-2 text-right">Skilled</th>
                <th className="border p-2 text-right">Unskilled</th>
                <th className="border p-2 text-right">Required</th>
                <th className="border p-2 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {workerRows.map(row => (
                <tr key={row.id}>
                  <td className="border p-2"><Input value={row.type} onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, type: e.target.value } : r))} /></td>
                  <td className="border p-2"><Input value={row.contractor} onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, contractor: e.target.value } : r))} /></td>
                  <td className="border p-2"><Input type="number" className="text-right" value={row.skilled || ''} onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, skilled: parseInt(e.target.value) || 0 } : r))} /></td>
                  <td className="border p-2"><Input type="number" className="text-right" value={row.unskilled || ''} onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, unskilled: parseInt(e.target.value) || 0 } : r))} /></td>
                  <td className="border p-2"><Input type="number" className="text-right" value={row.required || ''} onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, required: parseInt(e.target.value) || 0 } : r))} /></td>
                  <td className="border p-2 text-center">
                       <Button variant="ghost" size="icon" className="text-red-500 w-8 h-8" onClick={() => removeRow(setWorkerRows, row.id, workerRows)}>
                         <Trash2 className="w-4 h-4"/>
                       </Button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
            <Label>If Any Issue</Label>
            <Textarea className="mt-2" rows={4} placeholder="Enter issues, delays, or safety concerns here..." value={issues} onChange={e => setIssues(e.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
            <Label>Supervisor Signature</Label>
            <Input className="mt-2" placeholder="Enter name or draw signature here" value={signature} onChange={e => setSignature(e.target.value)} />
        </CardContent>
      </Card>
    </div>
  );
}
