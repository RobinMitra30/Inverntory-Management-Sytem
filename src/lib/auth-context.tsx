import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const currentProfile = userDoc.data() as UserProfile;
            setProfile(currentProfile);

            const isDev = user.email === 'structuremakers.india@gmail.com' || user.email === 'robin.mitra124421@gmail.com';
            if (isDev && currentProfile.role !== UserRole.ADMIN) {
              const updatedProfile = { ...currentProfile, role: UserRole.ADMIN };
              await updateDoc(userRef, { role: UserRole.ADMIN });
              setProfile(updatedProfile);
            }
          } else {
            const isDev = user.email === 'structuremakers.india@gmail.com' || user.email === 'robin.mitra124421@gmail.com';
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || 'Unnamed User',
              role: isDev ? UserRole.ADMIN : UserRole.SITE_SUPERVISOR, 
              assignedProjects: [],
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth context error:", err);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = async (username: string, password: string) => {
    // Map username to system email
    const email = `${username.trim().toLowerCase()}@system.local`;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

