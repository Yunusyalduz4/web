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
    
    // NextAuth logout - redirect'i manuel yapacağız
    await signOut({ 
      redirect: false
    });
    
    // Manuel redirect - domain sorununu önlemek için
    if (typeof window !== 'undefined') {
      window.location.href = '/login/';
    }
  } catch (error) {
    // Hata olsa bile local storage'ı temizle
    clearUserCredentials();
    
    // Hata durumunda da login'e yönlendir
    if (typeof window !== 'undefined') {
      window.location.href = '/login/';
    }
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
    // Silent error handling
  }
  
  return false;
};
