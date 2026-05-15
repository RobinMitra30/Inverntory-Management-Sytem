import React from 'react';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  ClipboardCheck,
  Zap,
  Activity,
  HardHat,
  Clock,
  Camera,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { profile } = useAuth();
  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/60 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-heading">Project Command Center</h1>
          <p className="text-slate-500 text-base font-medium">Real-time visibility into site workforce, material flow, and progress across all active projects.</p>
        </div>
        <div className="flex items-center gap-3">
           {profile?.role === UserRole.ADMIN && (
             <NavLink to="/admin">
               <Button variant="outline" className="h-11 px-6 gap-2 border-slate-200 text-slate-600 hover:text-primary hover:border-primary transition-all rounded-xl shadow-sm">
                 <Shield className="w-4 h-4" />
                 Admin Panel
               </Button>
             </NavLink>
           )}
           {/*
           <NavLink to="/progress">
             <Button variant="outline" className="h-11 px-6 gap-2 border-slate-200 text-slate-600 hover:text-primary hover:border-primary transition-all rounded-xl shadow-sm">
               <Camera className="w-4 h-4 text-primary" />
               Site Photos
             </Button>
           </NavLink>
           */}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Workforce On-Site', value: '124', trend: '+8', up: true, icon: HardHat, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Tasks Completed', value: '82%', trend: '+4%', up: true, icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Material Costs (MTD)', value: '₹1.8M', trend: 'Budgeted', up: null, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Open Issues', value: '12', trend: '-2', up: false, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <Card key={i} className="group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border-slate-100 rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                {stat.up !== null && (
                  <Badge variant={stat.up ? "success" : "destructive"} className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", stat.up ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-rose-100 text-rose-700 hover:bg-rose-100 border-none")}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {stat.trend}
                  </Badge>
                )}
                {stat.up === null && (
                  <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] font-bold border-slate-200 text-slate-500">
                    {stat.trend}
                  </Badge>
                )}
              </div>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 font-bold mb-2">{stat.label}</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/20 border-b border-slate-100 flex flex-row items-center justify-between py-6 px-10">
               <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Project Vitality</CardTitle>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Real-time site activity stream</p>
               </div>
               <Button variant="ghost" size="sm" className="text-xs text-primary font-bold hover:bg-primary/5 rounded-xl px-4">View History</Button>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-50">
                 {[
                   { type: 'DPR Submitted', ref: 'Skyline Residency', user: 'Amit Singh', time: '10m ago', icon: FileText, color: 'text-primary' },
                   { type: 'Material Received', ref: 'GRN-98210', user: 'Sunil (Store)', time: '2h ago', icon: Zap, color: 'text-emerald-500' },
                   { type: 'Flagged Issue', ref: 'Curing Delay (Block B)', user: 'QC Team', time: '5h ago', icon: AlertCircle, color: 'text-rose-500' },
                   { type: 'Task Completed', ref: '3rd Floor Plaster', user: 'Rajesh Contractor', time: '1d ago', icon: Activity, color: 'text-indigo-500' },
                 ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-6 px-10 hover:bg-slate-50/80 transition-all duration-200 group">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-50 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105`}>
                           <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">{item.type} <span className="text-slate-400 font-mono text-xs ml-3 bg-slate-100 px-2 py-0.5 rounded">@{item.ref}</span></p>
                          <p className="text-xs text-slate-500 flex items-center gap-2 font-medium mt-0.5">
                            <span className="font-bold text-slate-700">{item.user}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>{item.time}</span>
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl">
                         <ArrowUpRight className="w-5 h-5" />
                      </Button>
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
            <CardHeader className="bg-slate-50/20 px-8 py-6">
               <div className="flex items-center gap-3">
                 <AlertCircle className="w-5 h-5 text-rose-500" />
                 <CardTitle className="text-lg font-bold text-slate-800">Risk Assessment</CardTitle>
               </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
               <div className="space-y-6">
                 {[
                   { title: 'Resource Shortage', desc: 'Labor count is 20% below target in Skyline.', color: 'bg-rose-500' },
                   { title: 'Delayed Procurement', desc: 'Cement PO #88123 delivery expected 2 days late.', color: 'bg-amber-500' }
                 ].map((risk, i) => (
                   <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className={`w-1 ${risk.color} h-10 rounded-full shrink-0`}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{risk.title}</p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{risk.desc}</p>
                      </div>
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>
          
          <div className="bg-primary p-10 rounded-3xl text-white relative overflow-hidden group shadow-2xl shadow-primary/30">
             <div className="relative z-10">
               <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                 <FileText className="w-7 h-7 text-white" />
               </div>
               <h4 className="text-2xl font-bold mb-3 tracking-tight">Generate Daily Intelligence</h4>
               <p className="text-sm text-white/70 mb-8 leading-relaxed font-medium">Capture a high-fidelity report of all site activity for immediate executive review.</p>
               <Button className="w-full bg-white text-primary hover:bg-slate-50 border-none font-bold h-12 rounded-2xl shadow-xl shadow-black/10 transition-all active:scale-95">Download PDF Summary</Button>
             </div>
             <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
