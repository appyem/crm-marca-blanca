// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { UserSession, UserRole } from '@/types/auth.types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Escuchar cambios de autenticación en tiempo real
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          // Usuario autenticado: obtener datos adicionales de Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.name || null,
              role: userData.role as UserRole,
              tenantId: userData.tenantId,
            });
          } else {
            // Si el documento no existe en Firestore, usar datos básicos de Firebase Auth
            // Esto puede pasar si el usuario se registró pero aún no se creó su perfil
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'LECTURA', // Rol por defecto
              tenantId: 'default', // Tenant por defecto (se actualizará en Fase 3)
            });
          }
        } else {
          // Usuario no autenticado
          setUser(null);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos del usuario';
        setError(errorMessage);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup: desuscribir cuando el componente se desmonte
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto fácilmente
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}