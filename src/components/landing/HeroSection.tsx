import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Play, CheckCircle2, TrendingUp, Package, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

export function HeroSection() {
  return (
    <section className="relative pt-12 pb-16 px-4 md:px-6 z-10 w-full max-w-[1600px] mx-auto">
      <div className="grid lg:grid-cols-[1.1fr,1fr] gap-6 items-stretch">
        
        {/* Left Side: Call to Action Card matching Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[2.5rem] border-none shadow-xl shadow-teal-950/5 bg-white/60 backdrop-blur-xl p-10 md:p-14 flex flex-col justify-center relative overflow-hidden"
        >
          {/* Subtle decoration inside card */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/5 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              System Version 2.0
            </div>
            
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1] font-sans">
              Centralize your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">supply chain.</span>
            </h1>
            
            <p className="text-lg text-slate-600 mb-10 max-w-xl leading-relaxed font-medium">
              The enterprise-grade platform to unify operations, automate stock tracking, process requisitions, and accelerate your business workflow.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link to="/login">
                <Button size="lg" className="rounded-xl px-8 py-7 text-lg font-bold bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-600/20 w-full sm:w-auto">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="rounded-xl px-8 py-7 text-lg font-bold border-white/60 bg-white/40 hover:bg-white/60 text-slate-800 w-full sm:w-auto shadow-sm">
                  Request Demo
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-500 font-bold">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-teal-600 drop-shadow-sm"/> No credit card</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-teal-600 drop-shadow-sm"/> 14-day trial</div>
            </div>
          </div>
        </motion.div>
        
        {/* Right Side: KPI Widgets matching Dashboard layout */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex flex-col gap-6"
        >
          {/* Top smaller stats */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md relative overflow-hidden group hover:scale-[1.02] transition-transform p-8 flex flex-col justify-center h-48">
              <p className="text-xs font-bold text-slate-500 mb-1 tracking-widest uppercase">Total Products</p>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight font-sans">282</h2>
              <div className="w-10 h-10 bg-teal-100/50 rounded-xl flex items-center justify-center absolute top-6 right-6 text-teal-600 border border-teal-100">
                 <Package className="w-5 h-5" />
              </div>
            </Card>
            
            <Card className="rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md relative overflow-hidden group hover:scale-[1.02] transition-transform p-8 flex flex-col justify-center h-48">
              <p className="text-xs font-bold text-slate-500 mb-1 tracking-widest uppercase">Total Revenue</p>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight font-sans">₹308k</h2>
              <div className="w-10 h-10 bg-emerald-100/50 rounded-xl flex items-center justify-center absolute top-6 right-6 text-emerald-600 border border-emerald-100">
                 <TrendingUp className="w-5 h-5" />
              </div>
            </Card>
          </div>

          {/* Large Preview Card */}
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-teal-950/5 bg-white/60 backdrop-blur-md overflow-hidden flex-1 relative flex flex-col p-8">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-extrabold text-slate-900">Inventory Insights</h3>
               <div className="flex space-x-2">
                 <div className="w-8 h-8 rounded-full bg-slate-200/50" />
                 <div className="w-8 h-8 rounded-full bg-slate-200/50" />
               </div>
            </div>
            
            <div className="flex-1 bg-white/40 rounded-2xl border border-white/60 p-6 flex flex-col gap-4 relative overflow-hidden">
               {/* UI Mock elements */}
               <div className="w-1/3 h-4 bg-slate-300/40 rounded-md mb-4" />
               
               <div className="flex gap-4 items-end">
                 <div className="flex-1 h-32 bg-teal-500/20 rounded-t-xl rounded-b-sm border-t-2 border-teal-500 relative">
                   <div className="absolute bottom-2 left-2 right-2 h-20 bg-teal-400/20 rounded-md" />
                 </div>
                 <div className="flex-1 h-20 bg-teal-500/10 rounded-t-xl rounded-b-sm border-t-2 border-teal-400" />
                 <div className="flex-1 h-40 bg-teal-600/30 rounded-t-xl rounded-b-sm border-t-2 border-teal-600" />
               </div>
               
               <div className="mt-auto flex justify-between items-center text-xs font-bold text-slate-400">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
               </div>
            </div>
            
            <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-2xl shadow-xl shadow-teal-900/10 border border-white flex items-center gap-3 animate-bounce">
               <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                 <CheckCircle2 className="w-6 h-6 text-emerald-600" />
               </div>
               <div className="pr-2">
                 <div className="text-sm font-bold text-slate-900">Live Sync</div>
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active</div>
               </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
