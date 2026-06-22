import React from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { DemoRequestForm } from '@/components/landing/DemoRequestForm';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { 
  Building2, Users, TrendingUp, CheckCircle, Quote, Box, Layers, PieChart, Shield, Hexagon,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#addfe2] bg-gradient-to-tr from-[#9cd4d9] via-[#bce3e6] to-[#def5f6] overflow-hidden relative font-sans">
        {/* Decorative backdrop elements matching the Dashboard */}
        <div className="absolute top-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-[#7ec5cb]/30 blur-[130px] animate-pulse duration-[12000ms]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[65%] h-[65%] rounded-full bg-[#8bc4cb]/25 blur-[140px] animate-pulse duration-[10000ms]" />
        <div className="absolute top-[35%] left-[15%] w-[40%] h-[40%] rounded-full bg-[#addce0]/25 blur-[110px]" />
        
        <div className="relative z-10 h-screen overflow-y-auto">
          <Navbar />
          
          <main className="pb-24">
            <HeroSection />
            <FeaturesSection />
            
            {/* Extended Sections */}
            
            {/* Why Choose Us & Statistics */}
            <section id="why" className="py-24 relative w-full mx-auto px-4 md:px-6">
              <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div>
                    <h3 className="text-sm font-bold text-teal-700 uppercase tracking-widest mb-3">Why Us?</h3>
                    <h4 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight font-sans">The ultimate system for fast-moving teams</h4>
                    <p className="text-lg text-slate-700 mb-8 leading-relaxed font-medium">
                      Our platform replaces chaotic spreadsheets and siloed legacy software with a beautiful, real-time command center.
                    </p>
                    <ul className="space-y-6">
                      {[
                        "Real-time Inventory Tracking across all warehouses",
                        "Centralized workflows reducing manual data entry by 80%",
                        "Faster Procurement Workflow with auto-approvals",
                        "Improved Stock Visibility preventing stockouts",
                        "Reduced Material Wastage securing your bottom line"
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <div className="min-w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center mt-1">
                            <CheckCircle className="w-4 h-4 text-teal-700" />
                          </div>
                          <span className="text-slate-800 font-bold text-lg">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Dashboard stats style cards */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <Card className="rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md p-8 group hover:scale-[1.02] transition-transform">
                      <div className="w-12 h-12 rounded-xl bg-teal-100/50 flex items-center justify-center text-teal-600 mb-4 border border-teal-100">
                        <PieChart className="w-6 h-6" />
                      </div>
                      <div className="text-4xl font-extrabold text-slate-900 mb-2 font-sans">99.9%</div>
                      <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Inventory Accuracy</div>
                    </Card>
                    
                    <Card className="rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md p-8 group hover:scale-[1.02] transition-transform sm:translate-y-8">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="text-4xl font-extrabold text-slate-900 mb-2 font-sans">3x</div>
                      <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Faster Procurement</div>
                    </Card>
                    
                    <Card className="rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md p-8 group hover:scale-[1.02] transition-transform">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100/50 flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-4xl font-extrabold text-slate-900 mb-2 font-sans">10k+</div>
                      <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Active Daily Users</div>
                    </Card>

                    <Card className="rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md p-8 group hover:scale-[1.02] transition-transform sm:translate-y-8">
                      <div className="w-12 h-12 rounded-xl bg-orange-100/50 flex items-center justify-center text-orange-600 mb-4 border border-orange-100">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="text-4xl font-extrabold text-slate-900 mb-2 font-sans">5M+</div>
                      <div className="text-slate-500 font-bold text-sm tracking-wide uppercase">Items Tracked</div>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* Modules Showcase */}
            <section id="modules" className="py-24 relative min-h-[500px]">
              <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                  <div className="max-w-2xl">
                    <h3 className="text-sm font-bold text-teal-700 uppercase tracking-widest mb-3">Deep Dive</h3>
                    <h4 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-sans">Explore Core Modules</h4>
                  </div>
                  <Link to="/login">
                    <Button variant="outline" className="rounded-xl border-white/60 bg-white/40 font-bold text-slate-800 hover:bg-white/60 shadow-sm shadow-teal-900/5">View All Modules</Button>
                  </Link>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  <Card className="rounded-[2.5rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md overflow-hidden group hover:scale-[1.02] transition-transform flex flex-col p-6">
                      <div className="h-64 bg-slate-900/5 flex items-center justify-center p-6 relative overflow-hidden rounded-[2rem] border border-white/40 mb-6 group-hover:bg-teal-50/50 transition-colors">
                        <div className="w-full h-full bg-white/80 rounded-xl border border-white/60 shadow-xl shadow-teal-900/10 flex flex-col p-4 transform translate-y-8 group-hover:translate-y-4 transition-transform duration-500">
                          <div className="flex space-x-2 mb-4">
                            <div className="h-4 w-32 bg-slate-200 rounded-md" />
                            <div className="h-4 w-12 bg-teal-100 rounded-md" />
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1 h-32 bg-slate-100 rounded border border-slate-200" />
                            <div className="w-1/3 h-32 bg-teal-50 rounded border border-teal-100" />
                          </div>
                        </div>
                      </div>
                      <div className="px-4">
                        <h5 className="text-2xl font-extrabold text-slate-900 mb-3 font-sans">Inventory Lifecycle</h5>
                        <p className="text-slate-600 mb-6 font-medium">Control the entire lifecycle from PO to GRN and final issue to projects.</p>
                        <Link to="/login" className="text-teal-700 font-bold hover:text-teal-800 flex items-center gap-2">Explore Module <ArrowRight className="w-4 h-4" /></Link>
                      </div>
                  </Card>

                  <Card className="rounded-[2.5rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md overflow-hidden group hover:scale-[1.02] transition-transform flex flex-col p-6">
                      <div className="h-64 bg-slate-900/5 flex items-center justify-center p-6 relative overflow-hidden rounded-[2rem] border border-white/40 mb-6 group-hover:bg-teal-50/50 transition-colors">
                        <div className="w-full h-full bg-white/80 rounded-xl border border-white/60 shadow-xl shadow-teal-900/10 flex items-end justify-around p-8 transform translate-y-8 group-hover:translate-y-4 transition-transform duration-500 gap-4">
                          <div className="w-full bg-teal-200 rounded-t h-[30%]"></div>
                          <div className="w-full bg-teal-600 rounded-t h-[80%]"></div>
                          <div className="w-full bg-teal-400 rounded-t h-[50%]"></div>
                          <div className="w-full bg-teal-100 rounded-t h-[65%]"></div>
                        </div>
                      </div>
                      <div className="px-4">
                        <h5 className="text-2xl font-extrabold text-slate-900 mb-3 font-sans">Analytics & Reporting</h5>
                        <p className="text-slate-600 mb-6 font-medium">Generate powerful insights with our advanced drill-down capability.</p>
                        <Link to="/login" className="text-teal-700 font-bold hover:text-teal-800 flex items-center gap-2">Explore Module <ArrowRight className="w-4 h-4" /></Link>
                      </div>
                  </Card>
                </div>
              </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 relative">
              <div className="max-w-7xl mx-auto px-6 text-center">
                <h3 className="text-sm font-bold text-teal-700 uppercase tracking-widest mb-3">Customer Success</h3>
                <h4 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-16 tracking-tight font-sans">Don't just take our word for it</h4>
                
                <div className="grid md:grid-cols-3 gap-8 text-left">
                  {[
                    {
                      quote: "Switching to this platform gave us total control over our project stocks. Procurement is a breeze now.",
                      author: "Sarah Jenkins",
                      role: "Operations Director"
                    },
                    {
                      quote: "We reduced our material wastage by 45% in the first quarter of using this platform. Unbelievable ROI.",
                      author: "Marcus Aurelius",
                      role: "Supply Chain Manager"
                    },
                    {
                      quote: "The interface is gorgeous and incredibly fast. Our team needed zero training to get started.",
                      author: "Jessica Chen",
                      role: "Procurement Lead"
                    }
                  ].map((t, i) => (
                    <Card key={i} className="rounded-[2rem] border-none shadow-xl shadow-teal-950/2 bg-white/50 backdrop-blur-md p-10 relative">
                      <Quote className="w-10 h-10 text-teal-200 absolute top-8 right-8" />
                      <p className="text-slate-800 text-lg mb-8 relative z-10 font-bold leading-relaxed">"{t.quote}"</p>
                      <div>
                        <div className="font-extrabold text-slate-900">{t.author}</div>
                        <div className="text-sm text-slate-500 font-bold">{t.role}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </section>

            {/* About Us & Contact */}
            <section id="about" className="py-24 relative">
              <div className="max-w-7xl mx-auto px-6">
                <Card className="rounded-[2.5rem] border-none shadow-xl shadow-teal-950/5 bg-white/60 backdrop-blur-xl p-10 md:p-16">
                  <div className="grid lg:grid-cols-2 gap-20">
                    <div>
                      <h3 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-8 tracking-tight font-sans">About Us</h3>
                      <p className="text-lg text-slate-700 mb-6 leading-relaxed font-medium">
                        Founded in 2024, our mission is to redefine how modern businesses handle supply chain complexities. We believe enterprise software doesn't have to be clunky or confusing.
                      </p>
                      <p className="text-lg text-slate-700 mb-10 leading-relaxed font-medium">
                        By combining elegant design with robust engineering, we provide a unified platform that acts as the backbone of your operational success.
                      </p>
                      <div className="space-y-4">
                        <h5 className="font-extrabold text-slate-900">Our Core Values</h5>
                        <div className="flex gap-4 flex-wrap">
                          <span className="px-4 py-2 bg-teal-50/80 border border-teal-100 rounded-xl text-sm font-bold text-teal-800">Simplicity</span>
                          <span className="px-4 py-2 bg-teal-50/80 border border-teal-100 rounded-xl text-sm font-bold text-teal-800">Reliability</span>
                          <span className="px-4 py-2 bg-teal-50/80 border border-teal-100 rounded-xl text-sm font-bold text-teal-800">Innovation</span>
                        </div>
                      </div>
                    </div>
                    
                    <div id="contact" className="bg-white/80 rounded-[2rem] p-8 md:p-10 border border-white/60 shadow-inner">
                      <h3 className="text-2xl font-extrabold mb-2 text-slate-900 font-sans">Request a Demo</h3>
                      <p className="text-slate-500 mb-8 font-medium">Ready to upgrade your inventory stack?</p>
                      <DemoRequestForm />
                    </div>
                  </div>
                </Card>
              </div>
            </section>
          </main>

          {/* Footer inside the ecosystem */}
          <footer className="relative pb-10 pt-10 border-t border-teal-900/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-12">
                <div className="col-span-2 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-600/20">
                        <Box className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">Sync Inventory</h1>
                  </div>
                  <p className="text-slate-600 max-w-sm mb-6 font-medium">Transforming enterprise supply chain management with intelligent tools and beautiful design.</p>
                  <div className="text-slate-800 font-bold">contact@syncinventory.com</div>
                  <div className="text-slate-800 font-bold">+1 (800) 123-4567</div>
                </div>
                
                <div>
                  <h4 className="font-extrabold text-slate-900 mb-4 font-sans uppercase tracking-wider text-sm">Product</h4>
                  <ul className="space-y-3 text-slate-600 font-medium">
                    <li><a href="#features" className="hover:text-teal-700 text-sm">Features</a></li>
                    <li><a href="#modules" className="hover:text-teal-700 text-sm">Modules</a></li>
                    <li><Link to="/login" className="hover:text-teal-700 text-sm">Pricing</Link></li>
                    <li><Link to="/login" className="hover:text-teal-700 text-sm">Updates</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 mb-4 font-sans uppercase tracking-wider text-sm">Company</h4>
                  <ul className="space-y-3 text-slate-600 font-medium">
                    <li><a href="#about" className="hover:text-teal-700 text-sm">About Us</a></li>
                    <li><a href="#careers" className="hover:text-teal-700 text-sm">Careers</a></li>
                    <li><a href="#contact" className="hover:text-teal-700 text-sm">Contact Us</a></li>
                    <li><Link to="/login" className="hover:text-teal-700 text-sm">Partners</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 mb-4 font-sans uppercase tracking-wider text-sm">Legal</h4>
                  <ul className="space-y-3 text-slate-600 font-medium">
                    <li><a href="#privacy" className="hover:text-teal-700 text-sm">Privacy Policy</a></li>
                    <li><a href="#terms" className="hover:text-teal-700 text-sm">Terms of Service</a></li>
                    <li><a href="#security" className="hover:text-teal-700 text-sm">Security</a></li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-8 border-t border-teal-900/10 flex flex-col md:flex-row items-center justify-between gap-4">
                 <p className="text-sm text-slate-600 font-bold">© {new Date().getFullYear()} Sync Inventory Inc. All rights reserved.</p>
                 <div className="flex gap-4">
                    <Link to="/login"><Button variant="ghost" size="sm" className="font-bold text-slate-700 rounded-xl hover:bg-white/40">Log In</Button></Link>
                    <Link to="/login"><Button size="sm" className="bg-teal-600 text-white rounded-xl px-4 font-bold shadow-md shadow-teal-600/20">Sign Up</Button></Link>
                 </div>
              </div>
            </div>
          </footer>
        </div>
    </div>
  );
}
