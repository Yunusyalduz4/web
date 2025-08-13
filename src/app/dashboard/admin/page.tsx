"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from '../../../utils/trpcClient';
import { useEffect, useMemo, useState } from 'react';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user.role === 'admin';

  const [tab, setTab] = useState<'businesses'|'users'|'appointments'>('businesses');
  const [query, setQuery] = useState('');

  const businessesQuery = trpc.admin.listBusinesses.useQuery({ q: query || undefined }, { enabled: isAdmin && tab==='businesses' });
  const usersQuery = trpc.admin.listUsers.useQuery({ q: query || undefined }, { enabled: isAdmin && tab==='users' });
  const appointmentsQuery = trpc.admin.listAppointments.useQuery({ limit: 100 }, { enabled: isAdmin && tab==='appointments' });

  useEffect(() => {
    if (session && !isAdmin) router.push('/unauthorized');
  }, [session, isAdmin, router]);

  if (!session) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
        <div className="text-sm text-gray-600">Yükleniyor…</div>
      </main>
    );
  }

  return (
    <main className="relative max-w-5xl mx-auto p-3 pb-20 min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      <div className="sticky top-0 z-30 -mx-3 px-3 pt-2 pb-2 bg-white/70 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold tracking-tight text-gray-800">Admin • KUADO</div>
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/60 border border-white/40">
            {(['businesses','users','appointments'] as const).map(k => (
              <button key={k} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab===k?'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow':''}`} onClick={() => setTab(k)}>
                {k==='businesses'?'İşletmeler':k==='users'?'Müşteriler':'Randevular'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-2 border border-white/40 bg-white/60 text-gray-900 rounded-xl px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600"><path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/></svg>
            <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="Ara" className="bg-transparent outline-none text-sm" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        {tab === 'businesses' && <BusinessesPanel query={query} />}
        {tab === 'users' && <UsersPanel query={query} />}
        {tab === 'appointments' && <AppointmentsPanel />}
      </div>
    </main>
  );
}

function BusinessesPanel({ query }: { query: string }) {
  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.admin.listBusinesses.useQuery({ q: query || undefined });
  const update = trpc.admin.updateBusiness.useMutation();
  const remove = trpc.admin.deleteBusiness.useMutation();
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <section>
      {isLoading && <div className="text-sm text-gray-500">Yükleniyor…</div>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list?.map((b: any) => (
          <li key={b.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{b.name}</div>
                <div className="text-[11px] text-gray-600 truncate">{b.address}</div>
              </div>
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/70 border border-white/50">
                {b.profile_image_url ? <img src={b.profile_image_url} alt={b.name} className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-[10px] text-gray-600">🏢</div>}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[13px]">
              <button className="text-gray-900 font-medium" onClick={()=> setEditing(b)}>Düzenle</button>
              <button className="text-rose-700 font-medium" onClick={async ()=> { await remove.mutateAsync({ businessId: b.id }); utils.admin.listBusinesses.invalidate(); }}>Sil</button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <EditBusinessModal data={editing} onClose={()=> setEditing(null)} onSave={async (payload)=>{ await update.mutateAsync(payload as any); setEditing(null); utils.admin.listBusinesses.invalidate(); }} />
      )}
    </section>
  );
}

function UsersPanel({ query }: { query: string }) {
  const utils = trpc.useUtils();
  const { data: list, isLoading } = trpc.admin.listUsers.useQuery({ q: query || undefined });
  const update = trpc.admin.updateUser.useMutation();
  const remove = trpc.admin.deleteUser.useMutation();
  const [editing, setEditing] = useState<any | null>(null);
  return (
    <section>
      {isLoading && <div className="text-sm text-gray-500">Yükleniyor…</div>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list?.map((u: any) => (
          <li key={u.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{u.name}</div>
                <div className="text-[11px] text-gray-600 truncate">{u.email}</div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/70 border border-white/50 text-gray-800">{u.role}</span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[13px]">
              <button className="text-gray-900 font-medium" onClick={()=> setEditing(u)}>Düzenle</button>
              <button className="text-rose-700 font-medium" onClick={async ()=> { await remove.mutateAsync({ userId: u.id }); utils.admin.listUsers.invalidate(); }}>Sil</button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <EditUserModal data={editing} onClose={()=> setEditing(null)} onSave={async (payload)=>{ await update.mutateAsync(payload as any); setEditing(null); utils.admin.listUsers.invalidate(); }} />
      )}
    </section>
  );
}

function AppointmentsPanel() {
  const { data: list, isLoading } = trpc.admin.listAppointments.useQuery({ limit: 100 });
  const update = trpc.admin.updateAppointmentStatus.useMutation();
  const utils = trpc.useUtils();
  return (
    <section>
      {isLoading && <div className="text-sm text-gray-500">Yükleniyor…</div>}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list?.map((a: any) => (
          <li key={a.id} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{a.business_name || 'İşletme'}</div>
                <div className="text-[11px] text-gray-600 truncate">{a.user_name || 'Müşteri'}</div>
              </div>
              <div className="text-[11px] px-2 py-0.5 rounded-md bg-white/70 border border-white/50 text-gray-800">{a.status}</div>
            </div>
            <div className="text-[12px] text-gray-700" suppressHydrationWarning>{typeof window==='undefined' ? '' : new Intl.DateTimeFormat('tr-TR', { dateStyle:'medium', timeStyle:'short' }).format(new Date(a.appointment_datetime))}</div>
            <div className="mt-2 flex items-center gap-3 text-[13px]">
              {(['pending','confirmed','completed','cancelled'] as const).map(st => (
                <button key={st} className={`text-[13px] ${a.status===st? 'text-gray-900 font-semibold':'text-gray-700'}`} onClick={async ()=> { await update.mutateAsync({ id: a.id, status: st }); utils.admin.listAppointments.invalidate(); }}>{st}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EditBusinessModal({ data, onClose, onSave }: any) {
  const [form, setForm] = useState({
    id: data.id,
    name: data.name || '',
    description: data.description || '',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    profileImageUrl: data.profile_image_url || null,
  });
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-6 max-w-lg w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">İşletme Düzenle</h3>
          <button className="px-2 py-1 rounded-md bg-rose-600 text-white text-xs" onClick={onClose}>Kapat</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries({ name:'Ad', description:'Açıklama', address:'Adres', phone:'Telefon', email:'E-posta' }).map(([key,label]) => (
            <label key={key} className="block">
              <span className="block text-[11px] text-gray-600 mb-1">{label}</span>
              <input value={(form as any)[key]} onChange={(e)=> setForm(f=> ({...f, [key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          ))}
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-1">Profil Görseli URL</span>
            <input value={form.profileImageUrl || ''} onChange={(e)=> setForm(f=> ({...f, profileImageUrl: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lat</span>
              <input type="number" value={form.latitude} onChange={(e)=> setForm(f=> ({...f, latitude: Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lng</span>
              <input type="number" value={form.longitude} onChange={(e)=> setForm(f=> ({...f, longitude: Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm" onClick={onClose}>Vazgeç</button>
          <button className="py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold" onClick={()=> onSave(form)}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ data, onClose, onSave }: any) {
  const [form, setForm] = useState({
    id: data.id,
    name: data.name || '',
    email: data.email || '',
    role: data.role || 'user',
    phone: data.phone || '',
    address: data.address || '',
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  });
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/20 to-indigo-500/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-6 max-w-lg w-[92%] bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Kullanıcı Düzenle</h3>
          <button className="px-2 py-1 rounded-md bg-rose-600 text-white text-xs" onClick={onClose}>Kapat</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries({ name:'Ad', email:'E-posta', phone:'Telefon', address:'Adres' }).map(([key,label]) => (
            <label key={key} className="block">
              <span className="block text-[11px] text-gray-600 mb-1">{label}</span>
              <input value={(form as any)[key]} onChange={(e)=> setForm(f=> ({...f, [key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          ))}
          <label className="block">
            <span className="block text-[11px] text-gray-600 mb-1">Rol</span>
            <select value={form.role} onChange={(e)=> setForm(f=> ({...f, role: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none">
              <option value="user">user</option>
              <option value="business">business</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lat</span>
              <input type="number" value={form.latitude ?? ''} onChange={(e)=> setForm(f=> ({...f, latitude: e.target.value===''? null : Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
            <label className="block">
              <span className="block text-[11px] text-gray-600 mb-1">Lng</span>
              <input type="number" value={form.longitude ?? ''} onChange={(e)=> setForm(f=> ({...f, longitude: e.target.value===''? null : Number(e.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none" />
            </label>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="py-2 rounded-xl bg-white/70 border border-white/50 text-gray-900 text-sm" onClick={onClose}>Vazgeç</button>
          <button className="py-2 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold" onClick={()=> onSave(form)}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}


