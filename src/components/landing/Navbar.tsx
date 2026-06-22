import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    // The scroll listener needs to attach to the custom scrolling container if we use h-screen and overflow-y-auto on a div,
    // but typically we can just let the body scroll. If body scrolls, window.scrollY works.
    // If the div scrolls, we'd need to attach to the div. I'll change LandingPage to not force h-screen overflow-y-auto, 
    // or we can attach on scroll to window.
    window.addEventListener('scroll', handleScroll, { capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return (
    <nav className={cn(
      "sticky top-0 w-full z-50 transition-all duration-300 border-b",
      isScrolled 
        ? "bg-white/40 backdrop-blur-xl border-white/20 shadow-lg shadow-teal-950/5 py-4" 
        : "bg-transparent border-transparent py-6"
    )}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-600/20">
              <Box className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
              Sync Inventory
            </h1>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-semibold text-slate-700 hover:text-teal-700 transition-colors">Features</a>
          <a href="#modules" className="text-sm font-semibold text-slate-700 hover:text-teal-700 transition-colors">Modules</a>
          <a href="#about" className="text-sm font-semibold text-slate-700 hover:text-teal-700 transition-colors">About Us</a>
          <a href="#contact" className="text-sm font-semibold text-slate-700 hover:text-teal-700 transition-colors">Contact Us</a>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login">
             <Button variant="ghost" className="rounded-xl font-bold text-slate-700 hover:text-teal-900 hover:bg-white/50 transition-all">Login</Button>
          </Link>
          <Link to="/login">
             <Button className="rounded-xl font-bold px-6 bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20 text-white">Sign Up Free</Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-slate-700 hover:bg-white/30 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-xl py-6 px-6 flex flex-col gap-4">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-800 font-bold border-b border-white/50">Features</a>
          <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-800 font-bold border-b border-white/50">Modules</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-800 font-bold border-b border-white/50">About Us</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-800 font-bold border-b border-white/50">Contact Us</a>
          <div className="flex flex-col gap-3 pt-4">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-center rounded-xl bg-white border-white/60 font-bold text-slate-700 shadow-sm">Login</Button>
            </Link>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full justify-center rounded-xl bg-teal-600 text-white font-bold shadow-md shadow-teal-600/20">Sign Up Free</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
