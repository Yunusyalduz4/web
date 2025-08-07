"use client";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">📶</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          İnternet Bağlantısı Yok
        </h1>
        
        <p className="text-gray-600 mb-6">
          Şu anda çevrimdışısınız. İnternet bağlantınızı kontrol edip tekrar deneyin.
        </p>
        
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
        >
          Tekrar Dene
        </button>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-xl">
          <h3 className="font-semibold text-blue-800 mb-2">Çevrimdışı Özellikler</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Daha önce görüntülenen sayfalar</li>
            <li>• Kaydedilen randevu bilgileri</li>
            <li>• Temel uygulama işlevleri</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
