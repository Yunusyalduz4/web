"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'user' | 'business';
}

export default function SupportModal({ isOpen, onClose, userType }: SupportModalProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: userType === 'business' ? 'business' : 'general' as 'general' | 'business' | 'technical' | 'billing'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/support/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          userName: session?.user?.name,
          userType
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          subject: '',
          message: '',
          priority: 'medium',
          category: userType === 'business' ? 'business' : 'general'
        });
        setTimeout(() => {
          onClose();
          setSubmitStatus('idle');
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Support form error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Destek Talebi</h2>
              <p className="text-xs text-gray-600">
                {userType === 'business' ? 'İşletme Desteği' : 'Kullanıcı Desteği'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Kategori</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
            >
              {userType === 'business' ? (
                <>
                  <option value="business">İşletme Desteği</option>
                  <option value="technical">Teknik Sorun</option>
                  <option value="billing">Faturalandırma</option>
                </>
              ) : (
                <>
                  <option value="general">Genel Destek</option>
                  <option value="technical">Teknik Sorun</option>
                  <option value="billing">Faturalandırma</option>
                </>
              )}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Öncelik</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
            >
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Konu</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors"
              placeholder="Sorununuzu kısaca özetleyin"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Mesaj</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors resize-none"
              placeholder="Sorununuzu detaylı olarak açıklayın..."
            />
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-xs text-green-700">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Destek talebiniz başarıyla gönderildi! En kısa sürede dönüş yapacağız.</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Bir hata oluştu. Lütfen tekrar deneyin.</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gönderiliyor...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Destek Talebi Gönder
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-4 pb-4">
          <div className="text-center text-xs text-gray-500">
            <p>Destek talebiniz 24 saat içinde yanıtlanacaktır.</p>
            <p className="mt-1">
              Acil durumlar için: 
              <a href="mailto:destek@randevuo.com" className="text-rose-600 hover:text-rose-700 font-medium ml-1">
                destek@randevuo.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
