'use client';

import { useState } from 'react';
import { trpc } from '../utils/trpc';

interface WhatsAppSettingsModalProps {
  business: any;
  onClose: () => void;
}

export function WhatsAppSettingsModal({ business, onClose }: WhatsAppSettingsModalProps) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    whatsappOtpEnabled: business.whatsapp_otp_enabled || false,
    whatsappNotificationsEnabled: business.whatsapp_notifications_enabled || false,
    whatsappPhone: business.whatsapp_phone || '',
  });

  const updateWhatsAppSettings = trpc.admin.updateBusinessWhatsAppSettings.useMutation({
    onSuccess: () => {
      utils.admin.listBusinesses.invalidate();
      onClose();
    },
  });

  const handleSave = async () => {
    try {
      await updateWhatsAppSettings.mutateAsync({
        businessId: business.id,
        whatsappOtpEnabled: form.whatsappOtpEnabled,
        whatsappNotificationsEnabled: form.whatsappNotificationsEnabled,
        whatsappPhone: form.whatsappPhone || null,
      });
    } catch (error) {
      console.error('WhatsApp ayarları güncellenirken hata:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              📱 WhatsApp Ayarları
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {business.name}
              </h4>
              <p className="text-xs text-gray-600">{business.address}</p>
            </div>

            <div className="space-y-4">
              {/* OTP Sistemi */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-gray-900">OTP Sistemi</h5>
                  <p className="text-xs text-gray-600">Misafir kullanıcılar için telefon doğrulama</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.whatsappOtpEnabled}
                    onChange={(e) => setForm(f => ({ ...f, whatsappOtpEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Bildirimler */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Bildirimler</h5>
                  <p className="text-xs text-gray-600">Randevu onay ve hatırlatma bildirimleri</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.whatsappNotificationsEnabled}
                    onChange={(e) => setForm(f => ({ ...f, whatsappNotificationsEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* WhatsApp Numarası */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  WhatsApp Numarası
                </label>
                <input
                  type="tel"
                  value={form.whatsappPhone}
                  onChange={(e) => setForm(f => ({ ...f, whatsappPhone: e.target.value }))}
                  placeholder="+905551234567"
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white/80 border border-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  İşletmenin WhatsApp numarası (opsiyonel)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={updateWhatsAppSettings.isLoading}
              className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {updateWhatsAppSettings.isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
