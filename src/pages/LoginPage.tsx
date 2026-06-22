import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';

export default function LoginPage() {
  const { user, login, loginWithGoogle, loading } = useAuth();
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Waking up the site OS...</p>
        </div>
      </div>
    );
  }

  // If user is successfully logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
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

  return (
    <div className="min-h-screen bg-[#addfe2] bg-gradient-to-tr from-[#9cd4d9] via-[#bce3e6] to-[#def5f6] overflow-hidden relative font-sans flex flex-col">
      {/* Decorative backdrop elements matching the Dashboard */}
      <div className="absolute top-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-[#7ec5cb]/30 blur-[130px] animate-pulse duration-[12000ms]" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[65%] h-[65%] rounded-full bg-[#8bc4cb]/25 blur-[140px] animate-pulse duration-[10000ms]" />
      <div className="absolute top-[35%] left-[15%] w-[40%] h-[40%] rounded-full bg-[#addce0]/25 blur-[110px]" />
      
      <div className="relative z-10 hidden sm:block">
        <Navbar />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 w-full h-full pb-10">
        <div className="max-w-md w-full text-center space-y-8 bg-white/60 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl shadow-teal-950/10 border border-white/60">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg shadow-teal-600/20">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Sync Inventory</h1>
            <p className="text-slate-600 font-bold text-sm">Enter your system credentials</p>
          </div>
          
          <form className="space-y-4 text-left" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Username</label>
              <Input 
                type="text" 
                placeholder="Enter username" 
                className="h-12 bg-white/80 border-white/60 focus:bg-white rounded-xl shadow-sm focus:ring-teal-500/20 focus:border-teal-500"
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
                  className="h-12 bg-white/80 border-white/60 focus:bg-white rounded-xl pr-10 shadow-sm focus:ring-teal-500/20 focus:border-teal-500"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100 flex items-center justify-center">
                {loginError}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full h-12 mt-4 gap-2 text-base bg-teal-600 hover:bg-teal-700 transition-all font-bold rounded-xl shadow-lg shadow-teal-600/20 text-white"
            >
              {isLoggingIn ? 'Verifying...' : 'Login'}
              {!isLoggingIn && <LogIn className="w-4 h-4 ml-1" />}
            </Button>
          </form>
          
          <div className="pt-6 border-t border-slate-200/50 space-y-4">
             <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-12 gap-2 border-slate-300/50 bg-white/50 text-slate-700 hover:bg-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
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
            <p className="text-xs text-slate-500 font-bold">Contact Admin for System Access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
