'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CreateStoryForm } from '../../types/story';
import { validateFileSize, validateFileType, compressMedia, extractHashtags, extractMentions } from '../../utils/storyUtils';
import { X, Upload, Camera, Video, Type, Palette, Filter, Hash, AtSign, Play, Pause, RotateCcw, Check } from 'lucide-react';

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
  const [step, setStep] = useState<'upload' | 'edit' | 'publish'>('upload');
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        setStep('edit');
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

  // Renk seçimi
  const handleColorChange = (type: 'background' | 'text', color: string) => {
    setForm(prev => ({
      ...prev,
      [type === 'background' ? 'backgroundColor' : 'textColor']: color
    }));
  };

  // Font değişikliği
  const handleFontChange = (font: string) => {
    setForm(prev => ({
      ...prev,
      fontFamily: font
    }));
  };

  // Font boyutu değişikliği
  const handleFontSizeChange = (size: number) => {
    setForm(prev => ({
      ...prev,
      fontSize: Math.max(8, Math.min(72, size))
    }));
  };

  // Metin pozisyonu değişikliği
  const handleTextPositionChange = (position: 'top' | 'center' | 'bottom') => {
    setForm(prev => ({
      ...prev,
      textPosition: position
    }));
  };

  // Filtre uygulama
  const handleFilterChange = (filter: string) => {
    setForm(prev => ({
      ...prev,
      filterType: filter
    }));
  };

  // Hikaye yayınlama
  const handlePublish = async () => {
    setIsPublishing(true);
    setUploadError('');

    try {
      // Önce medyayı yükle
      const uploadResponse = await fetch('/api/story/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: form.mediaUrl,
          fileName: `story_${Date.now()}.${form.mediaType === 'image' ? 'jpg' : 'mp4'}`,
          fileType: form.mediaType === 'image' ? 'image/jpeg' : 'video/mp4'
        }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Medya yükleme hatası');
      }

      const uploadResult = await uploadResponse.json();

      // Hikaye oluştur
      const createResponse = await fetch('/api/story/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          mediaUrl: uploadResult.url,
          mediaSize: uploadResult.size,
          mediaDuration: uploadResult.duration
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
      console.error('Hikaye yayınlama hatası:', error);
      setUploadError(error instanceof Error ? error.message : 'Hikaye yayınlama hatası');
    } finally {
      setIsPublishing(false);
    }
  };

  // Video oynatma kontrolü
  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
          
          {step === 'edit' && (
            <button
              onClick={() => setStep('publish')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              İleri
            </button>
          )}
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="pt-16 pb-20 h-full">
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Hikaye Oluştur</h3>
              <p className="text-gray-300">Fotoğraf veya video yükleyerek hikayenizi paylaşın</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-8 rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                <Camera className="w-8 h-8 mx-auto mb-2" />
                <span className="text-sm font-medium">Fotoğraf</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-8 rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                <Video className="w-8 h-8 mx-auto mb-2" />
                <span className="text-sm font-medium">Video</span>
              </button>
            </div>

            {uploadError && (
              <div className="mt-4 text-red-400 text-sm text-center">
                {uploadError}
              </div>
            )}

            {isUploading && (
              <div className="mt-4 text-white text-sm">
                Yükleniyor...
              </div>
            )}
          </div>
        )}

        {step === 'edit' && (
          <div className="h-full flex">
            {/* Medya Önizleme */}
            <div className="flex-1 relative">
              <div className="relative w-full h-full">
                {form.mediaType === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      className="w-full h-full object-cover"
                      loop
                      muted
                    />
                    <button
                      onClick={toggleVideoPlayback}
                      className="absolute inset-0 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12" />}
                    </button>
                  </div>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Hikaye önizleme"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Metin Overlay */}
                {form.caption && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center p-8"
                    style={{
                      background: `linear-gradient(45deg, ${form.backgroundColor}20, transparent)`
                    }}
                  >
                    <p
                      className="text-center font-medium text-lg max-w-md"
                      style={{
                        color: form.textColor,
                        fontFamily: form.fontFamily,
                        fontSize: `${form.fontSize}px`,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {form.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Düzenleme Paneli */}
            <div className="w-80 bg-gray-900 p-4 overflow-y-auto">
              <div className="space-y-6">
                {/* Metin Düzenleme */}
                <div>
                  <button
                    onClick={() => setShowTextEditor(!showTextEditor)}
                    className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
                  >
                    <Type className="w-5 h-5" />
                    <span>Metin Ekle</span>
                  </button>
                  
                  {showTextEditor && (
                    <div className="mt-4 space-y-4">
                      <textarea
                        value={form.caption}
                        onChange={(e) => handleCaptionChange(e.target.value)}
                        placeholder="Hikayenize metin ekleyin..."
                        className="w-full bg-gray-800 text-white rounded-lg p-3 text-sm resize-none"
                        rows={3}
                        maxLength={200}
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleTextPositionChange('top')}
                          className={`p-2 rounded text-xs ${
                            form.textPosition === 'top' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          Üst
                        </button>
                        <button
                          onClick={() => handleTextPositionChange('center')}
                          className={`p-2 rounded text-xs ${
                            form.textPosition === 'center' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          Orta
                        </button>
                        <button
                          onClick={() => handleTextPositionChange('bottom')}
                          className={`p-2 rounded text-xs ${
                            form.textPosition === 'bottom' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          Alt
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Renk Seçimi */}
                <div>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
                  >
                    <Palette className="w-5 h-5" />
                    <span>Renkler</span>
                  </button>
                  
                  {showColorPicker && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="text-gray-300 text-sm">Arka Plan</label>
                        <div className="flex space-x-2 mt-2">
                          {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(color => (
                            <button
                              key={color}
                              onClick={() => handleColorChange('background', color)}
                              className={`w-8 h-8 rounded-full border-2 ${
                                form.backgroundColor === color ? 'border-white' : 'border-gray-600'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-gray-300 text-sm">Metin</label>
                        <div className="flex space-x-2 mt-2">
                          {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(color => (
                            <button
                              key={color}
                              onClick={() => handleColorChange('text', color)}
                              className={`w-8 h-8 rounded-full border-2 ${
                                form.textColor === color ? 'border-white' : 'border-gray-600'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Font Seçimi */}
                <div>
                  <label className="text-gray-300 text-sm">Font</label>
                  <select
                    value={form.fontFamily}
                    onChange={(e) => handleFontChange(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg p-2 text-sm mt-2"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>

                {/* Font Boyutu */}
                <div>
                  <label className="text-gray-300 text-sm">Font Boyutu: {form.fontSize}px</label>
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={form.fontSize}
                    onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>

                {/* Filtreler */}
                <div>
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors"
                  >
                    <Filter className="w-5 h-5" />
                    <span>Filtreler</span>
                  </button>
                  
                  {showFilterMenu && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {['none', 'vintage', 'black_white', 'sepia', 'blur', 'brightness'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => handleFilterChange(filter)}
                          className={`p-2 rounded text-xs ${
                            form.filterType === filter ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {filter === 'none' ? 'Normal' : filter}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'publish' && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Hikayenizi Yayınlayın</h3>
              <p className="text-gray-300">Hikayeniz 24 saat boyunca görünür olacak</p>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Hikaye Özeti</h4>
                <div className="text-gray-300 text-sm space-y-1">
                  <p>Medya: {form.mediaType === 'image' ? 'Fotoğraf' : 'Video'}</p>
                  <p>Metin: {form.caption ? 'Var' : 'Yok'}</p>
                  <p>Hashtag: {form.hashtags?.length || 0} adet</p>
                  <p>Mention: {form.mentions?.length || 0} adet</p>
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isPublishing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isPublishing ? 'Yayınlanıyor...' : 'Hikayeyi Yayınla'}
              </button>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-600 text-sm">{uploadError}</p>
                </div>
              )}
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
