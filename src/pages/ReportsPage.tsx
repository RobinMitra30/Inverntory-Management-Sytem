import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { POService, MovementService, ProductService, ProjectService } from '@/services/store';
import { PurchaseOrder, StockMovement, Product, MovementType, Project } from '@/types';

const COLORS = ['#0f172a', '#ea580c', '#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function ReportsPage() {
  const { id: projectIdParam } = useParams<{ id: string }>();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'30D'|'3M'|'6M'|'12M'>('6M');

  useEffect(() => {
    let isMounted = true;
    const unsubPO = POService.subscribe((data) => {
      if (isMounted) {
        setPos(projectIdParam ? data.filter(d => d.projectId === projectIdParam) : data);
      }
    });
    const unsubMovements = MovementService.subscribe((data) => {
      if (isMounted) {
        setMovements(projectIdParam ? data.filter(d => d.projectId === projectIdParam) : data);
      }
    });
    const unsubProducts = ProductService.subscribe((data) => {
      if (isMounted) {
        setProducts(data);
      }
    });
    const unsubProjects = ProjectService.subscribe((data) => {
      if (isMounted) {
        setProjects(data);
      }
    });

    // Instead of synchronously setting loading false, wait for initial load if necessary, or do it on mount.
    // Setting it in timeout prevents the synchronous effect trigger warning
    setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 0);

    return () => {
      isMounted = false;
      unsubPO();
      unsubMovements();
      unsubProducts();
      unsubProjects();
    };
  }, [projectIdParam]);

  const { filteredPos, filteredMovements } = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);
    if (timeFilter === '30D') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === '3M') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (timeFilter === '6M') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (timeFilter === '12M') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    const fp = pos.filter(p => {
      if (!projectIdParam && selectedProject !== 'ALL' && p.projectId !== selectedProject) return false;
      return new Date(p.createdAt) >= startDate;
    });
    const fm = movements.filter(m => {
      if (!projectIdParam && selectedProject !== 'ALL' && m.projectId !== selectedProject) return false;
      return new Date(m.createdAt) >= startDate;
    });
    return { filteredPos: fp, filteredMovements: fm };
  }, [pos, movements, timeFilter, selectedProject, projectIdParam]);

  // 1. Material Trends Data Processing
  interface TrendBin {
    name: string;
    month?: number;
    year?: number;
    key?: string;
    received: number;
    consumed: number;
  }
  const trendsData = useMemo(() => {
    const now = new Date();
    const bins: TrendBin[] = [];
    
    if (timeFilter === '30D') {
       for(let i=29; i>=0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          bins.push({
             name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
             key: d.toISOString().split('T')[0],
             received: 0,
             consumed: 0
          });
       }
    } else {
       const monthsCount = timeFilter === '3M' ? 3 : timeFilter === '6M' ? 6 : 12;
       for (let i = monthsCount - 1; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         bins.push({
           name: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
           month: d.getMonth(),
           year: d.getFullYear(),
           received: 0,
           consumed: 0
         });
       }
    }

    filteredMovements.forEach(m => {
        const date = new Date(m.createdAt);
        if (timeFilter === '30D') {
            const key = date.toISOString().split('T')[0];
            const b = bins.find(b => b.key === key);
            if (b) {
                if (m.type === MovementType.IN) b.received += m.quantity;
                else if (m.type === MovementType.OUT) b.consumed += Math.abs(m.quantity);
            }
        } else {
            const mIdx = bins.findIndex(l => l.month === date.getMonth() && l.year === date.getFullYear());
            if (mIdx !== -1) {
              if (m.type === MovementType.IN) bins[mIdx].received += m.quantity;
              else if (m.type === MovementType.OUT) bins[mIdx].consumed += Math.abs(m.quantity);
            }
        }
    });

    return bins;
  }, [filteredMovements, timeFilter]);

  // 2. Category-wise Expenditure
  const expenditureData = useMemo(() => {
    const catMap: Record<string, number> = {};
    
    filteredPos.forEach(po => {
      if (po.status === 'REJECTED') return;
      
      po.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const category = product?.category || 'General';
        const itemTotal = item.quantityOrdered * item.unitPrice;
        catMap[category] = (catMap[category] || 0) + itemTotal;
      });
    });

    return Object.entries(catMap).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPos, products]);

  const totalExpenditure = useMemo(() => {
    return expenditureData.reduce((sum, item) => sum + item.value, 0);
  }, [expenditureData]);

  // 3. Inventory Turnover (Simplified as Received Value Trend)
  interface TurnoverBin {
    name: string;
    month?: number;
    year?: number;
    key?: string;
    value: number;
  }
  const turnoverData = useMemo(() => {
    const now = new Date();
    const bins: TurnoverBin[] = [];
    
    if (timeFilter === '30D') {
       for(let i=29; i>=0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          bins.push({
             name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
             key: d.toISOString().split('T')[0],
             value: 0
          });
       }
    } else {
       const monthsCount = timeFilter === '3M' ? 3 : timeFilter === '6M' ? 6 : 12;
       for (let i = monthsCount - 1; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         bins.push({
           name: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
           month: d.getMonth(),
           year: d.getFullYear(),
           value: 0
         });
       }
    }

    filteredPos.forEach(po => {
      if (po.status === 'REJECTED') return;
      const date = new Date(po.createdAt);

      if (timeFilter === '30D') {
          const key = date.toISOString().split('T')[0];
          const b = bins.find(b => b.key === key);
          if (b) {
              b.value += po.totalAmount;
          }
      } else {
          const mIdx = bins.findIndex(l => l.month === date.getMonth() && l.year === date.getFullYear());
          if (mIdx !== -1) {
            bins[mIdx].value += po.totalAmount;
          }
      }
    });

    return bins;
  }, [filteredPos, timeFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif italic">Analytics Dashboard</h1>
          <p className="text-slate-500 text-sm">Strategic reports and trend analysis built from real-time data.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {!projectIdParam && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={timeFilter} onValueChange={(val: '30D'|'3M'|'6M'|'12M') => setTimeFilter(val)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30D">Last 30 Days</SelectItem>
              <SelectItem value="3M">Last 3 Months</SelectItem>
              <SelectItem value="6M">Last 6 Months</SelectItem>
              <SelectItem value="12M">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Material Trends Card */}
        <Card className="rounded-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
             <CardTitle className="text-xs font-mono uppercase tracking-widest text-slate-500">Material Flow (Received vs Consumed Qty)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '0', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}
                    formatter={(val: number, name: string) => [`${val.toLocaleString()} Units`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace' }} />
                  <Bar name="Received" dataKey="received" fill="#ea580c" radius={[2, 2, 0, 0]} />
                  <Bar name="Consumed" dataKey="consumed" fill="#0f172a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Expenditure Card */}
        <Card className="rounded-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
             <CardTitle className="text-xs font-mono uppercase tracking-widest text-slate-500">Expenditure by Category (₹)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] flex flex-col justify-center">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenditureData.length > 0 ? expenditureData : [{ name: 'No Data', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      {expenditureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      {expenditureData.length === 0 && <Cell fill="#f1f5f9" />}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number, name: string) => expenditureData.length > 0 ? [`₹${val.toLocaleString()}`, name] : ['N/A', '']}
                      contentStyle={{ borderRadius: '0', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 px-2">
                 {expenditureData.slice(0, 8).map((item, i) => {
                    const pct = totalExpenditure > 0 ? ((item.value / totalExpenditure) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 w-20">
                         <div className="flex items-center gap-1 w-full justify-center">
                           <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                           <span className="text-[10px] uppercase font-mono text-slate-600 truncate">{item.name}</span>
                         </div>
                         <div className="flex items-center gap-1 text-[10px] font-mono">
                           <span className="font-bold text-slate-700">{pct}%</span>
                           <span className="text-slate-400 hidden sm:inline">({(item.value / 1000).toFixed(0)}k)</span>
                         </div>
                      </div>
                    )
                 })}
                 {expenditureData.length === 0 && (
                   <p className="text-[10px] uppercase font-mono text-slate-400 italic">No purchase data available</p>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Procurement Trend Card */}
      <Card className="rounded-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-xs font-mono uppercase tracking-widest text-slate-500">Procurement Volume (Purchase Value ₹)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip 
                  formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Ordered Value']}
                  contentStyle={{ borderRadius: '0', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ea580c" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


