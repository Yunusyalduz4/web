import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';

export default async function GizlilikPage() {
  const filePath = path.join(process.cwd(), 'gizlilik');
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    content = 'Gizlilik Politikası ve Kullanım Şartları metni yüklenemedi.';
  }

  const lines = content.split('\n');

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-gray-100/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-gray-800 hover:underline">RANDEVUO</Link>
          <Link href="/register" className="px-3 py-2 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold shadow-lg">
            Kayıt Ol
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Gizlilik Politikası ve Kullanım Şartları</h1>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6">
          <article className="prose prose-sm max-w-none text-gray-800">
            {lines.map((line, idx) => (
              <p key={idx} className="whitespace-pre-wrap leading-7 text-[15px]">{line}</p>
            ))}
          </article>
        </div>
        <div className="text-center mt-8">
          <Link href="/register" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl">
            Kayıt Sayfasına Dön
          </Link>
        </div>
      </div>
    </main>
  );
}


