"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  fallback = null, 
  redirectTo = "/login" 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return; // Hala yükleniyor

    if (status === "unauthenticated") {
      // Oturum açık değil - modal göster
      setShowModal(true);
    } else if (status === "authenticated") {
      // Oturum açık - modal'ı kapat
      setShowModal(false);
    }
  }, [status]);

  // Yükleniyor durumunda fallback göster
  if (status === "loading") {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Oturum açık değilse modal göster
  if (status === "unauthenticated") {
    return (
      <>
        {children}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-white/40">
              {/* Header */}
              <div className="bg-gradient-to-r from-rose-500 to-fuchsia-500 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M12 15l-3-3h6l-3 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 9l-3 3h6l-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Oturum Gerekli</h2>
                <p className="text-white/90 text-sm">Bu sayfaya erişmek için giriş yapmanız gerekiyor.</p>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-rose-600">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Giriş Yapın</h3>
                  <p className="text-gray-600 text-sm">Randevu sistemine erişmek için lütfen giriş yapın veya hesap oluşturun.</p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/login")}
                    className="w-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-rose-600 hover:to-fuchsia-600 active:from-rose-700 active:to-fuchsia-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Giriş Yap
                  </button>
                  
                  <button
                    onClick={() => router.push("/register")}
                    className="w-full bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:border-rose-300 hover:bg-rose-50 active:bg-rose-100 transition-all"
                  >
                    Hesap Oluştur
                  </button>
                  
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 px-4 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    İptal
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 text-center">
                <p className="text-xs text-gray-500">
                  Güvenli giriş ile verileriniz korunur
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Oturum açıksa children'ı göster
  return <>{children}</>;
}
