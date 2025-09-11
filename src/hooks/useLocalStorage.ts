import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State'i başlat
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  // Local storage'a yazma fonksiyonu
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
    }
  };

  // Local storage'dan silme fonksiyonu
  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
    }
  };

  return [storedValue, setValue, removeValue] as const;
}

// Kullanıcı bilgileri için özel hook
export function useUserCredentials() {
  const [credentials, setCredentials, removeCredentials] = useLocalStorage('userCredentials', {
    email: '',
    password: '',
    rememberMe: false
  });

  const saveCredentials = (email: string, password: string, rememberMe: boolean = false) => {
    if (rememberMe) {
      setCredentials({ email, password, rememberMe: true });
    } else {
      removeCredentials();
    }
  };

  const clearCredentials = () => {
    removeCredentials();
  };

  return {
    credentials,
    saveCredentials,
    clearCredentials
  };
}
