import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ProjectSidebar } from './ProjectSidebar';
import { Navbar } from './Navbar';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-slate-100">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white text-4xl font-bold border border-blue-700 shadow-xl shadow-blue-200">S</div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">SiteFlow</h1>
            <p className="text-slate-500 font-medium text-sm">Enter your system credentials</p>
          </div>
          
          <form className="space-y-4 text-left" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Username</label>
              <Input 
                type="text" 
                placeholder="Enter username" 
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 relative">
              <label className="text-sm font-bold text-slate-700">Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter password" 
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 flex items-center justify-center">
                {loginError}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full h-12 mt-2 gap-2 text-base bg-blue-600 hover:bg-blue-700 transition-all font-bold rounded-xl shadow-md"
            >
              {isLoggingIn ? 'Verifying...' : 'Login'}
              {!isLoggingIn && <LogIn className="w-4 h-4 ml-1" />}
            </Button>
          </form>
          
          <div className="pt-4 border-t border-slate-100 space-y-4">
             <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-10 gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
             >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Developer Login (Google)
             </Button>
            <p className="text-xs text-slate-400 font-semibold">Contact Admin for System Access</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 h-full bg-white flex-shrink-0">
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

