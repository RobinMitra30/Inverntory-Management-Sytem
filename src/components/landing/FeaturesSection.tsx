import React from 'react';
import { 
  LayoutDashboard, Settings, Package, ClipboardCheck,
  RotateCcw, FileText, ShoppingCart, ListChecks,
  Users, BarChart3, Target, ShieldCheck,
  Briefcase, Wrench, ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  { icon: LayoutDashboard, title: "Inventory Dashboard", desc: "Real-time visibility into all your inventory and project statuses in one centralized view." },
  { icon: Settings, title: "Inventory Control", desc: "Granular control over stock movements, thresholds, and inventory levels." },
  { icon: Package, title: "Product Catalog", desc: "Centralized management of your entire product ecosystem with variants." },
  { icon: ClipboardCheck, title: "Stock Audit", desc: "Accurate, automated stock auditing to eliminate discrepancies." },
  { icon: RotateCcw, title: "Returns Management", desc: "Seamless handling of product returns and reverse logistics workflows." },
  { icon: ListChecks, title: "Requisitions", desc: "Streamline external procurement requests with automated approvals." },
  { icon: ShoppingCart, title: "Purchase Orders", desc: "End-to-end management of your purchase order lifecycle." },
  { icon: FileText, title: "GRNs", desc: "Digitized Goods Receipt Notes for flawless receiving processes." }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h3 className="text-sm font-bold text-teal-700 uppercase tracking-widest mb-3">Core Capabilities</h3>
          <h4 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight font-sans">Everything you need to scale</h4>
          <p className="text-lg text-slate-700 font-medium max-w-2xl mx-auto">
            A complete suite of tools designed to manage your supply chain effectively, from procurement to project fulfillment.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="group p-8 rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md hover:scale-[1.02] transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-teal-100/50 flex items-center justify-center border border-teal-100 mb-6 group-hover:bg-teal-600 transition-colors duration-300 shadow-sm shadow-teal-900/5">
                <f.icon className="w-6 h-6 text-teal-700 group-hover:text-white transition-colors duration-300" />
              </div>
              <h4 className="font-extrabold text-slate-900 mb-3 text-lg leading-tight font-sans">{f.title}</h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">{f.desc}</p>
              <div className="flex items-center text-sm font-bold text-teal-700 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 cursor-pointer">
                Explore <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
