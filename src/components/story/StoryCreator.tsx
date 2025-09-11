'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CreateStoryForm } from '../../types/story';
import { validateFileSize, validateFileType, compressMedia, extractHashtags, extractMentions } from '../../utils/storyUtils';
import { X, Upload, Camera, Video } from 'lucide-react';

interface StoryCreatorProps {
  businessId: string;
  onSuccess: (story: any) => void;
  onCancel: () => void;
  className?: string;
}

export default function StoryCreator({
  businessId,
  onSuccess,
  onCancel,
  className = ''
}: StoryCreatorProps) {
  const [form, setForm] = useState<CreateStoryForm>({
    businessId,
    mediaUrl: '',
    mediaType: 'image',
    caption: '',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    fontFamily: 'Arial',
    fontSize: 16,
    textPosition: 'center',
    filterType: 'none',
    hashtags: [],
    mentions: []
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dosya yükleme
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError('');

    try {
      // Dosya validasyonu
      if (!validateFileSize(file, 50 * 1024 * 1024)) { // 50MB max
        throw new Error('Dosya boyutu çok büyük (Max: 50MB)');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
      if (!validateFileType(file, allowedTypes)) {
        throw new Error('Desteklenmeyen dosya formatı');
      }

      // Dosyayı sıkıştır
      const compressedFile = await compressMedia(file, {
        maxSize: 50 * 1024 * 1024,
        allowedTypes,
        quality: 80,
        maxWidth: 1080,
        maxHeight: 1920,
        compress: true
      });

      // Base64'e çevir (gerçek uygulamada cloud storage'a yüklenir)
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setForm(prev => ({
          ...prev,
          mediaUrl: result,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
          mediaSize: compressedFile.size
        }));
        setPreviewUrl(result);
      };
      reader.readAsDataURL(compressedFile);

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Dosya yükleme hatası');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Metin düzenleme
  const handleCaptionChange = (text: string) => {
    setForm(prev => ({
      ...prev,
      caption: text
    }));

    // Hashtag ve mention'ları otomatik çıkar
    const hashtags = extractHashtags(text);
    const mentions = extractMentions(text);
    setForm(prev => ({
      ...prev,
      hashtags,
      mentions
    }));
  };

  // Hikaye yayınlama
  const handlePublish = async () => {
    setIsPublishing(true);
    setUploadError('');

    try {
      // Önce medyayı yükle (yorumlara fotoğraf ekleme sistemi gibi)
      const uploadResponse = await fetch('/api/upload_base64', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataUrl: form.mediaUrl,
          filename: `story_${Date.now()}.${form.mediaType === 'image' ? 'jpg' : 'mp4'}`
        }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Medya yükleme hatası');
      }

      const uploadData = await uploadResponse.json();

      // Hikaye oluştur
      const createResponse = await fetch('/api/story/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          mediaUrl: uploadData.url,
          mediaSize: uploadData.size || 0,
          mediaDuration: uploadData.duration || null
        }),
      });

      if (createResponse.ok) {
        const result = await createResponse.json();
        onSuccess(result.story);
      } else {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Hikaye yayınlanamadı');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Hikaye yayınlama hatası');
    } finally {
      setIsPublishing(false);
    }
  };


  return (
    <div className={`fixed inset-0 z-50 bg-black ${className}`}>
      {/* Üst Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex justify-between items-center text-white">
          <button
            onClick={onCancel}
            className="hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <h2 className="text-lg font-medium">Hikaye Oluştur</h2>
          
          {previewUrl && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {isPublishing ? 'Yayınlanıyor...' : 'Yayınla'}
            </button>
          )}
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="pt-16 pb-20 h-full">
        {!previewUrl ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl border-2 border-white/20">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-3xl font-black text-white mb-3 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">Hikaye Oluştur</h3>
              <p className="text-gray-200 text-lg font-medium">Fotoğraf veya video yükleyerek hikayenizi paylaşın</p>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
              {/* Fotoğraf Yükleme Butonu */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="group relative bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-8 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-2xl border-2 border-white/20 hover:border-white/40"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all duration-300">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-lg font-bold mb-2">Fotoğraf</span>
                  <span className="text-xs text-white/80">JPG, PNG, WebP</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              {/* Video Yükleme Butonu */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="group relative bg-gradient-to-br from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white p-8 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-2xl border-2 border-white/20 hover:border-white/40"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all duration-300">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-lg font-bold mb-2">Video</span>
                  <span className="text-xs text-white/80">MP4, WebM</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>

            {uploadError && (
              <div className="mt-6 p-4 bg-red-500/20 border-2 border-red-400 rounded-2xl text-red-200 text-sm text-center font-bold">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <span>Hata!</span>
                </div>
                {uploadError}
              </div>
            )}

            {isUploading && (
              <div className="mt-6 p-4 bg-blue-500/20 border-2 border-blue-400 rounded-2xl text-blue-200 text-sm text-center font-bold">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-transparent rounded-full animate-spin"></div>
                  <span>Yükleniyor...</span>
                </div>
                <p className="text-xs">Lütfen bekleyin</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Medya Önizleme */}
            <div className="flex-1 relative">
              <div className="relative w-full h-full">
                {form.mediaType === 'video' ? (
                  <video
                    src={previewUrl}
                    className="w-full h-full object-cover"
                    loop
                    muted
                    autoPlay
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Hikaye önizleme"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Basit Metin Girişi */}
            <div className="p-4 bg-gray-900">
              <textarea
                value={form.caption}
                onChange={(e) => handleCaptionChange(e.target.value)}
                placeholder="Hikayenize metin ekleyin... (isteğe bağlı)"
                className="w-full bg-gray-800 text-white rounded-lg p-3 text-sm resize-none"
                rows={2}
                maxLength={200}
              />
              <div className="text-xs text-gray-400 mt-1">
                {(form.caption || '').length}/200 karakter
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gizli Dosya Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        className="hidden"
      />
    </div>
  );
}
