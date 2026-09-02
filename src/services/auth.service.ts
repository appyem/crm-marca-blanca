// src/services/auth.service.ts
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  UserCredential
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebase/client';
import { AuthError } from '@/types/auth.types';

export const authService = {
  /**
   * Registra un nuevo usuario con email y contraseña
   */
  async signUp(email: string, password: string): Promise<UserCredential> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Establecer cookie de sesión después del registro exitoso
      await this.setSessionCookie();
      
      return credential;
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      throw {
        code: firebaseError.code || 'auth/unknown',
        message: this.getErrorMessage(firebaseError.code || 'auth/unknown'),
      } as AuthError;
    }
  },

  /**
   * Inicia sesión con email y contraseña
   */
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      
      // Establecer cookie de sesión después del login exitoso
      await this.setSessionCookie();
      
      return credential;
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      throw {
        code: firebaseError.code || 'auth/unknown',
        message: this.getErrorMessage(firebaseError.code || 'auth/unknown'),
      } as AuthError;
    }
  },

  /**
   * Cierra la sesión del usuario actual
   */
  async logOut(): Promise<void> {
    try {
      await signOut(auth);
      
      // Eliminar cookie de sesión después del logout
      await this.clearSessionCookie();
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      throw {
        code: firebaseError.code || 'auth/unknown',
        message: 'Error al cerrar sesión. Inténtalo de nuevo.',
      } as AuthError;
    }
  },

  /**
   * Establece una cookie de sesión para el middleware
   */
  async setSessionCookie(): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      // Obtener el token de ID del usuario
      const token = await user.getIdToken();
      
      // Establecer cookie (válida por 5 días)
      document.cookie = `__session=${token}; max-age=${5 * 24 * 60 * 60}; path=/; SameSite=Strict; Secure`;
    }
  },

  /**
   * Elimina la cookie de sesión
   */
  async clearSessionCookie(): Promise<void> {
    document.cookie = '__session=; max-age=0; path=/; SameSite=Strict; Secure';
  },

  /**
   * Traduce los códigos de error de Firebase a mensajes amigables en español
   */
  getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado.';
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos fallidos. Inténtalo más tarde.';
      default:
        return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    }
  },
};