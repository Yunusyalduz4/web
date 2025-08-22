import { signOut } from 'next-auth/react';

// Local storage'dan kullanıcı bilgilerini temizle
export const clearUserCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userCredentials');
  }
};

// Güvenli logout işlemi
export const handleLogout = async () => {
  try {
    // Local storage'dan bilgileri temizle
    clearUserCredentials();
    
    // NextAuth logout
    await signOut({ 
      redirect: true,
      callbackUrl: '/login'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Hata olsa bile local storage'ı temizle
    clearUserCredentials();
  }
};

// Kullanıcı bilgilerini kontrol et
export const hasStoredCredentials = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const credentials = localStorage.getItem('userCredentials');
    if (credentials) {
      const parsed = JSON.parse(credentials);
      return parsed.rememberMe && parsed.email && parsed.password;
    }
  } catch (error) {
    console.error('Error checking stored credentials:', error);
  }
  
  return false;
};
