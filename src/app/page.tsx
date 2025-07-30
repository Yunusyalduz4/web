import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-4xl font-bold">Kuaför & Berber Randevu Sistemi</h1>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Giriş Yap</Link>
        <Link href="/register" className="px-6 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300">Kayıt Ol</Link>
      </div>
    </main>
  );
}
