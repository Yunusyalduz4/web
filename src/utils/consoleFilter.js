// Next.js 15 static file 404 hatalarını filtrele
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const message = args[0];
    
    // Next.js 15 static file 404 hatalarını filtrele
    if (
      typeof message === 'string' && 
      (
        message.includes('Failed to load resource') ||
        message.includes('404 (Not Found)') ||
        message.includes('_next/static/')
      )
    ) {
      return; // Bu hataları gösterme
    }
    
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args[0];
    
    // Next.js 15 static file uyarılarını filtrele
    if (
      typeof message === 'string' && 
      (
        message.includes('Failed to load resource') ||
        message.includes('404 (Not Found)') ||
        message.includes('_next/static/')
      )
    ) {
      return; // Bu uyarıları gösterme
    }
    
    originalWarn.apply(console, args);
  };
}
