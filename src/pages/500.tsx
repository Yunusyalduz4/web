import { NextPage } from 'next';
import Head from 'next/head';

const Custom500: NextPage = () => {
  return (
    <>
      <Head>
        <title>500 - Server Error | RANDEVUO</title>
        <meta name="description" content="Sunucu hatası oluştu" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="text-center space-y-6 p-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">500</h1>
            <h2 className="text-xl font-semibold text-gray-700">Sunucu Hatası</h2>
            <p className="text-gray-600 max-w-md">
              Üzgünüz, sunucuda bir hata oluştu. Lütfen daha sonra tekrar deneyin.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white px-6 py-3 rounded-xl font-medium hover:from-rose-600 hover:to-fuchsia-600 transition-all"
            >
              Ana Sayfaya Dön
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-gray-700 px-6 py-3 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Custom500;
