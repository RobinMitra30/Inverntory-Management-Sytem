import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ProjectSidebar } from './ProjectSidebar';
import { Navbar } from './Navbar';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useLocation, useParams, Navigate } from 'react-router-dom';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, login, loginWithGoogle, loading } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Check if we are in a project-specific route
  const isProjectRoute = location.pathname.startsWith('/projects/') && location.pathname !== '/projects';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Waking up the site OS...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      if (!username.trim() || !password) {
        throw new Error("Please enter both username and password");
      }
      await login(username.trim(), password);
    } catch (err: any) {
      setLoginError("Invalid Username or Password");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLoginError("Google Sign-In Failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-[#addfe2] bg-gradient-to-tr from-[#9cd4d9] via-[#bce3e6] to-[#def5f6] overflow-hidden relative">
      {/* Floating blurred organic shapes to create the ambient aura shown in the mockup */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-[#7ec5cb]/30 blur-[130px] animate-pulse duration-[12000ms]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[65%] h-[65%] rounded-full bg-[#8bc4cb]/25 blur-[140px] animate-pulse duration-[10000ms]" />
        <div className="absolute top-[35%] left-[15%] w-[40%] h-[40%] rounded-full bg-[#addce0]/25 blur-[110px]" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block transition-all duration-300 ease-in-out flex-shrink-0 w-64 h-full">
        {isProjectRoute ? (
          <ProjectSidebar />
        ) : (
          <Sidebar />
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 h-full bg-[#addfe2] flex-shrink-0">
            {isProjectRoute ? (
              <ProjectSidebar />
            ) : (
              <Sidebar />
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

