"use client";
import { useState, useEffect } from 'react';
import { trpc } from '../utils/trpcClient';
import StarRating from './StarRating';
import { useWebSocket } from '../contexts/WebSocketContext';

// Helper functions
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: file.type }));
        } else {
          resolve(file);
        }
      }, file.type, 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  businessName: string;
  serviceName: string;
  employeeName: string;
  onReviewSubmitted: () => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  appointmentId,
  businessName,
  serviceName,
  employeeName,
  onReviewSubmitted
}: ReviewModalProps) {
  const [serviceRating, setServiceRating] = useState(0);
  const [employeeRating, setEmployeeRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState('');
  
  // WebSocket entegrasyonu
  const { isConnected, emit } = useWebSocket();

  const createReviewMutation = trpc.review.create.useMutation({
    onSuccess: (data) => {
      // WebSocket ile yorum oluşturulduğunu bildir
      if (isConnected) {
        emit('review:created', {
          reviewId: data.id,
          appointmentId: appointmentId,
          businessName: businessName,
          serviceName: serviceName,
          employeeName: employeeName,
          rating: serviceRating,
          comment: comment,
          timestamp: new Date().toISOString()
        });
      }
      
      onReviewSubmitted();
      onClose();
      // Reset form
      setServiceRating(0);
      setEmployeeRating(0);
      setComment('');
      setPhotos([]);
      setError('');
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (serviceRating === 0) {
      setError('Lütfen hizmet puanını seçin');
      return;
    }

    if (employeeRating === 0) {
      setError('Lütfen çalışan puanını seçin');
      return;
    }

    if (comment.length < 20) {
      setError('Yorum en az 20 karakter olmalıdır');
      return;
    }

    const reviewData = {
      appointmentId,
      serviceRating,
      employeeRating,
      comment,
      photos
    };
    
    
    createReviewMutation.mutate(reviewData);
  };

  const handlePhotoUpload = async (files: FileList) => {
    if (photos.length + files.length > 5) {
      setError('En fazla 5 fotoğraf yükleyebilirsiniz');
      return;
    }

    setUploadingPhotos(true);
    setError('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Resize image if too large
        const resizedFile = await resizeImage(file, 800, 600);
        
        // Convert to base64
        const base64 = await fileToBase64(resizedFile);
        
        // Upload to server
        const response = await fetch('/api/upload_base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: base64, filename: file.name })
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const { url } = await response.json();
        return url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotos(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      setError('Fotoğraf yükleme hatası: ' + (error as Error).message);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const isFormValid = serviceRating > 0 && employeeRating > 0 && comment.length >= 20;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Değerlendirme Yap</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            {businessName} - {serviceName}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Service Rating */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Hizmet Puanı
            </label>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                💇‍♂️
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{serviceName}</p>
                <StarRating
                  rating={serviceRating}
                  onRatingChange={setServiceRating}
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Employee Rating */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Çalışan Puanı
            </label>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
                ✂️
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{employeeName}</p>
                <StarRating
                  rating={employeeRating}
                  onRatingChange={setEmployeeRating}
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Yorumunuz
            </label>
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deneyiminizi paylaşın (en az 20 karakter)"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {comment.length}/500
              </div>
            </div>
            {comment.length > 0 && comment.length < 20 && (
              <p className="text-xs text-red-500">
                En az 20 karakter gerekli ({20 - comment.length} karakter daha)
              </p>
            )}
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Fotoğraflar (İsteğe bağlı)
            </label>
            
            {/* Photo Upload Area */}
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                className="hidden"
                id="photo-upload"
                disabled={uploadingPhotos || photos.length >= 5}
              />
              <label
                htmlFor="photo-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                  uploadingPhotos || photos.length >= 5
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingPhotos ? (
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-8 h-8 text-blue-500 mb-2">📷</div>
                  )}
                  <p className="text-sm text-gray-500 text-center">
                    {uploadingPhotos
                      ? 'Yükleniyor...'
                      : photos.length >= 5
                      ? 'Maksimum 5 fotoğraf'
                      : 'Fotoğraf eklemek için tıklayın'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {photos.length}/5 fotoğraf
                  </p>
                </div>
              </label>

              {/* Photo Preview Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">⚠️</div>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || createReviewMutation.isPending}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3"
          >
            {createReviewMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <span className="text-xl">⭐</span>
                <span>Değerlendirmeyi Gönder</span>
              </>
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </div>
  );
} 