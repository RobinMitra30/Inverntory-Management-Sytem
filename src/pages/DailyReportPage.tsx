import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, FileText, Plus, Trash2, Printer, Download, Calendar, Activity, Users, AlertTriangle, FileSpreadsheet, PenTool, Package } from 'lucide-react';
import { Project, Product, Stock } from '@/types';
import { ProjectService, ProductService, ProgressService, InventoryService } from '@/services/store';
import { MaterialSelector } from '@/components/MaterialSelector';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function DailyReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getProjectDisplayName = (projectId: string, proj?: Project | null): string => {
    const isRawId = (str?: string) => {
      if (!str) return true;
      if (str.includes(' ')) return false;
      return /^[a-zA-Z0-9_-]{5,30}$/.test(str);
    };
    if (proj?.name && !isRawId(proj.name)) {
      return proj.name;
    }
    const defaultMappings: Record<string, string> = {
      'pMUUAjtOuJ8BjHiHoBgY': 'Grand Horizon Mall',
      'demo-project': 'Grand Horizon Mall',
    };
    if (defaultMappings[projectId]) return defaultMappings[projectId];
    if (proj?.name && isRawId(proj.name)) {
      return `Horizon Project (${proj.name.substring(0, 6).toUpperCase()})`;
    }
    if (/^[a-zA-Z0-9_-]{5,30}$/.test(projectId)) {
      return `Horizon Project (${projectId.substring(0, 6).toUpperCase()})`;
    }
    return proj?.name || projectId || 'Grand Horizon Mall';
  };
  
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
                userName: profile?.name || 'Supervisor',
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
    <div className="space-y-6 sm:space-y-8 p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/projects/${id}`)}
          className="rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-150/80 font-bold px-3 sm:px-4 transition-all gap-2 text-xs h-9"
        >
          <ArrowLeft className="w-4 h-4 text-teal-600" /> Back to Project
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-2 border-b border-slate-200/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-950 tracking-tight flex items-center gap-2 sm:gap-3 italic">
            <FileSpreadsheet className="w-7 h-7 sm:w-8 sm:h-8 text-teal-600 shrink-0" />
            Daily Site Report
          </h1>
          <p className="text-slate-500 font-medium italic mt-1 uppercase text-[10px] sm:text-xs tracking-widest">
            Progress, Materials, Labor & Daily Field Log
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
          <Button 
            variant="outline" 
            className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 font-bold h-10 sm:h-11 px-3 sm:px-4 transition-all text-xs gap-1.5 shadow-2xs flex-1 sm:flex-initial justify-center"
          >
            <Save className="w-3.5 h-3.5 text-slate-400" /> Save Draft
          </Button>
          
          <Button 
            className="rounded-xl bg-teal-600 hover:bg-teal-750 text-white font-bold h-10 sm:h-11 px-3 sm:px-5 transition-all text-xs gap-1.5 shadow-lg shadow-teal-600/15 flex-1 sm:flex-initial justify-center" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            <FileText className="w-3.5 h-3.5" />
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>

          <Button 
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 font-bold h-10 sm:h-11 px-3 sm:px-4 transition-all text-xs gap-1.5 shadow-2xs flex-1 sm:flex-initial justify-center"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export PDF
          </Button>

          <Button 
            variant="outline"
            className="rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 font-bold h-10 sm:h-11 px-3 sm:px-4 transition-all text-xs gap-1.5 shadow-2xs flex-1 sm:flex-initial justify-center"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" /> Print
          </Button>
        </div>
      </div>

      {/* Metadata Detail */}
      <Card className="rounded-3xl md:rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-xl shadow-teal-950/2 overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site Name</Label>
            <Input 
              placeholder="Site Name" 
              value={getProjectDisplayName(id || '', project)} 
              readOnly 
              className="bg-slate-100/60 border-slate-200/50 cursor-not-allowed rounded-xl h-10 sm:h-11 text-xs sm:text-sm font-semibold text-slate-600 shadow-2xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site Incharge Name</Label>
            <Input 
              placeholder="Enter incharge name" 
              value={siteIncharge} 
              onChange={e => setSiteIncharge(e.target.value)} 
              className="bg-white border-slate-200 rounded-xl h-10 sm:h-11 text-xs sm:text-sm font-medium focus:border-teal-500 focus:ring-teal-500/10 text-slate-900 shadow-2xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</Label>
            <Input 
              type="date" 
              value={reportDate} 
              onChange={e => setReportDate(e.target.value)} 
              className="bg-white border-slate-200 rounded-xl h-10 sm:h-11 text-xs sm:text-sm font-mono text-slate-900 focus:border-teal-500 focus:ring-teal-500/10 shadow-2xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Detail */}
      <Card className="rounded-3xl md:rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-xl shadow-teal-950/2 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 md:p-8 border-b border-slate-100/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 border border-white/60 shadow-xs flex items-center justify-center text-teal-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-heading font-black italic text-slate-900 tracking-tight leading-none">Stock Detail</CardTitle>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">Live Material Ledger Input</p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md shadow-teal-600/15 h-10 px-4 gap-2 w-full sm:w-auto justify-center"
            onClick={() => addRow(setStockRows, { productId: '', received: 0, stock: 0, used: 0, balance: 0 }, stockRows)}
          >
            <Plus className="w-4 h-4" /> 
            Add Material
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div className="min-w-[720px] sm:min-w-[800px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-150/80">
                  <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[240px] sm:w-[320px]">Material Name</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[95px] sm:w-[110px]">Received</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[95px] sm:w-[110px]">Stock</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[95px] sm:w-[110px]">Used</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[100px] sm:w-[115px] text-teal-600 bg-teal-50/20">Balance</th>
                  <th className="p-3 sm:p-4 w-[50px] sm:w-[60px] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {stockRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-3 sm:p-4">
                       <MaterialSelector 
                         products={products}
                         selectedProductId={row.productId}
                         onSelect={(pid) => {
                           const currentStock = stocks.find(s => s.productId === pid && s.projectId === id)?.quantity || 0;
                           setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, productId: pid, stock: currentStock, balance: (currentStock + r.received) - r.used } : r));
                         }}
                         className="rounded-xl border-slate-200 h-10 sm:h-11 bg-white focus:ring-teal-500/15 text-xs font-semibold"
                       />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-bold bg-white text-xs sm:text-sm" 
                        value={row.received || ''} 
                        onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, received: val, balance: (r.stock + val) - r.used } : r))
                        }} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 bg-slate-50 border-slate-200/80 rounded-xl text-slate-500 font-bold text-xs sm:text-sm" 
                        value={row.stock || ''} 
                        onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, stock: val, balance: (val + r.received) - r.used } : r))
                        }} 
                        placeholder="Stock" 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-bold bg-white text-xs sm:text-sm" 
                        value={row.used || ''} 
                        onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setStockRows(prev => prev.map(r => r.id === row.id ? { ...r, used: val, balance: (r.stock + r.received) - val } : r))
                        }} 
                      />
                    </td>
                    <td className="p-3 sm:p-4 bg-teal-50/20">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 bg-teal-50/40 border-teal-100/50 rounded-xl text-teal-700 font-black cursor-not-allowed text-xs sm:text-sm" 
                        value={row.balance} 
                        readOnly 
                      />
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-9 h-9 transition-colors" 
                         onClick={() => removeRow(setStockRows, row.id, stockRows)}
                       >
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
      <Card className="rounded-3xl md:rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-xl shadow-teal-950/2 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 md:p-8 border-b border-slate-100/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 border border-white/60 shadow-xs flex items-center justify-center text-teal-600 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-heading font-black italic text-slate-900 tracking-tight leading-none">Work Detail</CardTitle>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">Track physical tasks and completions</p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md shadow-teal-600/15 h-10 px-4 gap-2 w-full sm:w-auto justify-center"
            onClick={() => addRow(setWorkRows, { type: '', total: 0, unit: 'Sqft', today: 0, balance: 0, progress: 0, drawing: 'No' }, workRows)}
          >
            <Plus className="w-4 h-4" /> 
            Add Work Line
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div className="min-w-[900px] sm:min-w-[1000px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-150/80">
                  <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest">Work Type</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[100px] sm:w-[110px]">Total Target</th>
                  <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[120px] sm:w-[140px]">Unit Of Work</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[130px] sm:w-[150px]">Today's Completed</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[130px] sm:w-[150px]">Remaining Work</th>
                  <th className="p-3 sm:p-4 text-center font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[120px] sm:w-[140px]">Progress</th>
                  <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[90px] sm:w-[110px]">Drawing</th>
                  <th className="p-3 sm:p-4 w-[50px] sm:w-[60px] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-medium">
                {workRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-3 sm:p-4">
                      <Input 
                        className="h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-semibold bg-white text-xs" 
                        placeholder="e.g. Brickwork Ground Floor"
                        value={row.type} 
                        onChange={e => setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, type: e.target.value } : r))} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-bold bg-white text-xs sm:text-sm" 
                        value={row.total || ''} 
                        onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const td = row.today;
                            let bal = val - td;
                            let prog = val > 0 ? (td / val) * 100 : 0;
                            if (val < td) {
                              prog = 100;
                              bal = 0;
                            }
                            setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, total: val, balance: bal, progress: Math.min(prog, 100) } : r))
                        }} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                       <select 
                          className="flex h-10 sm:h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-2 sm:px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-500 focus:ring-teal-500/10 transition-shadow outline-hidden"
                          value={row.unit} 
                          onChange={e => setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, unit: e.target.value } : r))}
                       >
                          {['Sqft', 'Meter', 'Length', 'Running Feet', 'Nos', 'KG', 'Cubic Feet'].map(u => (
                             <option key={u} value={u}>{u}</option>
                          ))}
                       </select>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-bold bg-white text-xs sm:text-sm" 
                        value={row.today || ''} 
                        onChange={e => {
                            let val = parseFloat(e.target.value) || 0;
                            if (row.total > 0 && val > row.total) { // Validation rule
                               val = row.total;
                            }
                            const bal = row.total - val;
                            const prog = row.total > 0 ? (val / row.total) * 100 : 0;
                            setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, today: val, balance: bal, progress: prog } : r))
                        }} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                       <Input 
                         type="number" 
                         className="text-right h-10 sm:h-11 bg-slate-50 border-slate-200/80 rounded-xl text-slate-500 font-semibold cursor-not-allowed text-xs sm:text-sm" 
                         value={row.balance} 
                         readOnly 
                       />
                    </td>
                    <td className="p-3 sm:p-4">
                       <div className="flex flex-col items-center gap-1.5 w-24 mx-auto">
                          <span className="font-bold font-mono text-[10px] sm:text-[11px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">{row.progress.toFixed(1)}%</span>
                          <div className="w-full bg-slate-100 rounded-full h-1 border border-slate-250/50">
                             <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-1 rounded-full transition-all duration-300" style={{ width: `${row.progress}%` }}></div>
                          </div>
                       </div>
                    </td>
                    <td className="p-3 sm:p-4">
                       <select 
                         className="flex h-10 sm:h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-2 sm:px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-500 focus:ring-teal-500/10 transition-shadow outline-hidden font-semibold" 
                         value={row.drawing} 
                         onChange={e => setWorkRows(prev => prev.map(r => r.id === row.id ? { ...r, drawing: e.target.value } : r))}
                       >
                          <option>Yes</option>
                          <option>No</option>
                       </select>
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-9 h-9 transition-colors" 
                         onClick={() => removeRow(setWorkRows, row.id, workRows)}
                       >
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
      <Card className="rounded-3xl md:rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-xl shadow-teal-950/2 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 md:p-8 border-b border-slate-100/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 border border-white/60 shadow-xs flex items-center justify-center text-teal-600 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-heading font-black italic text-slate-900 tracking-tight leading-none">Work Detail</CardTitle>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">Schedule and timeline tracker</p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md shadow-teal-600/15 h-10 px-4 gap-2 w-full sm:w-auto justify-center"
            onClick={() => addRow(setTimelineRows, { type: '', start: '', end: '', remark: '' }, timelineRows)}
          >
            <Plus className="w-4 h-4" /> 
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div className="min-w-[720px] sm:min-w-[800px]">
            <table className="w-full text-xs">
              <thead>
                 <tr className="bg-slate-50/50 border-b border-slate-150/80">
                   <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest">Work Item</th>
                   <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[140px] sm:w-[160px]">Start Date</th>
                   <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[140px] sm:w-[160px]">Approx End Date</th>
                   <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[200px] sm:w-[250px]">Remark</th>
                   <th className="p-3 sm:p-4 w-[50px] sm:w-[60px] text-center"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                 {timelineRows.map(row => (
                   <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-3 sm:p-4">
                        <Input 
                          className="h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-semibold bg-white text-xs" 
                          placeholder="e.g. Concrete Slab Casting"
                          value={row.type} 
                          onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, type: e.target.value } : r))} 
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        <Input 
                          type="date" 
                          className="h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-mono text-slate-900 bg-white text-xs" 
                          value={row.start} 
                          onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, start: e.target.value } : r))} 
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        <Input 
                          type="date" 
                          className="h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-mono text-slate-900 bg-white text-xs" 
                          value={row.end} 
                          onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, end: e.target.value } : r))} 
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        <Input 
                          className="h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-medium bg-white text-xs" 
                          placeholder="Status, milestones or notes"
                          value={row.remark} 
                          onChange={e => setTimelineRows(prev => prev.map(r => r.id === row.id ? { ...r, remark: e.target.value } : r))} 
                        />
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-9 h-9 transition-colors" 
                           onClick={() => removeRow(setTimelineRows, row.id, timelineRows)}
                         >
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

      {/* Worker Detail */}
      <Card className="rounded-3xl md:rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-xl shadow-teal-950/2 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 md:p-8 border-b border-slate-100/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 border border-white/60 shadow-xs flex items-center justify-center text-teal-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-heading font-black italic text-slate-900 tracking-tight leading-none">Worker Detail</CardTitle>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">Deployments and contractor roll lists</p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md shadow-teal-600/15 h-10 px-4 gap-2 w-full sm:w-auto justify-center"
            onClick={() => addRow(setWorkerRows, { type: '', contractor: '', skilled: 0, unskilled: 0, required: 0 }, workerRows)}
          >
            <Plus className="w-4 h-4" /> 
            Add Manpower
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div className="min-w-[720px] sm:min-w-[800px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-150/80">
                  <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="p-3 sm:p-4 text-left font-bold text-[10px] text-slate-500 uppercase tracking-widest">Contractor Name</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[100px] sm:w-[110px]">Skilled</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[100px] sm:w-[110px]">Unskilled</th>
                  <th className="p-3 sm:p-4 text-right font-bold text-[10px] text-slate-500 uppercase tracking-widest w-[100px] sm:w-[110px]">Required</th>
                  <th className="p-3 sm:p-4 w-[50px] sm:w-[60px] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-medium">
                {workerRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-3 sm:p-4">
                      <Input 
                        className="h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-semibold bg-white text-xs" 
                        placeholder="e.g. Mason / Helper"
                        value={row.type} 
                        onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, type: e.target.value } : r))} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        className="h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-semibold bg-white text-xs" 
                        placeholder="Contractor/Team name"
                        value={row.contractor} 
                        onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, contractor: e.target.value } : r))} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-bold bg-white text-xs sm:text-sm" 
                        value={row.skilled || ''} 
                        onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, skilled: parseInt(e.target.value) || 0 } : r))} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-bold bg-white text-xs sm:text-sm" 
                        value={row.unskilled || ''} 
                        onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, unskilled: parseInt(e.target.value) || 0 } : r))} 
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <Input 
                        type="number" 
                        className="text-right h-10 sm:h-11 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 font-bold bg-white text-xs sm:text-sm" 
                        value={row.required || ''} 
                        onChange={e => setWorkerRows(prev => prev.map(r => r.id === row.id ? { ...r, required: parseInt(e.target.value) || 0 } : r))} 
                      />
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl w-9 h-9 transition-colors" 
                         onClick={() => removeRow(setWorkerRows, row.id, workerRows)}
                       >
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
      
      {/* Issues & Constraints */}
      <Card className="rounded-3xl md:rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-xl shadow-teal-950/2 overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 border border-white/60 shadow-xs flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <Label className="text-sm font-black font-heading italic text-slate-800 tracking-tight block">Observations & Site Issues</Label>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-0.5">Report delays, weather issues or incidents</p>
              </div>
            </div>
            
            <Textarea 
              className="mt-2 rounded-2xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 text-xs font-semibold p-4 tracking-wide bg-white leading-relaxed min-h-[120px]" 
              rows={4} 
              placeholder="Record issues, material shortage, machine breakdowns, or critical safety incidents here..." 
              value={issues} 
              onChange={e => setIssues(e.target.value)} 
            />
        </CardContent>
      </Card>

      {/* Signature & Verification */}
      <Card className="rounded-3xl md:rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-xl shadow-teal-950/2 overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 border border-white/60 shadow-xs flex items-center justify-center text-teal-600 shrink-0">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <Label className="text-sm font-black font-heading italic text-slate-800 tracking-tight block">Supervisor Signature</Label>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-0.5">Certify report details digitally</p>
              </div>
            </div>
            
            <Input 
              className="mt-2 rounded-xl border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 text-xs font-semibold h-11 bg-white" 
              placeholder="Sign with your full name..." 
              value={signature} 
              onChange={e => setSignature(e.target.value)} 
            />
        </CardContent>
      </Card>
    </div>
  );
}
