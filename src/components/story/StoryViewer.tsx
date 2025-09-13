'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Story } from '../../types/story';
import { getStoryStatus, formatTimeRemaining, calculateViewDuration, getDeviceType } from '../../utils/storyUtils';
import { X, ChevronLeft, ChevronRight, Heart, MoreHorizontal, Play, Pause } from 'lucide-react';

interface StoryViewerProps {
  stories: Story[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onLike: (storyId: string) => void;
  className?: string;
}

export default function StoryViewer({
  stories,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onLike,
  className = ''
}: StoryViewerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(currentIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isCheckingLike, setIsCheckingLike] = useState(false);
  const [viewStartTime, setViewStartTime] = useState<number>(0);
  
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStory = stories[currentStoryIndex];

  // Hikaye değiştiğinde progress'i sıfırla
  useEffect(() => {
    setProgress(0);
    setIsPlaying(true);
    setViewStartTime(Date.now());
    checkLikeStatus();
    
    // Progress bar'ı başlat
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 0.5; // 5 saniyede tamamlanır
      });
    }, 25);
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStoryIndex]);

  // Video oynatma kontrolü
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentStoryIndex]);

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      onNext();
    } else {
      // setTimeout ile render döngüsünden çıkar
      setTimeout(() => {
        onClose();
      }, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      onPrevious();
    }
  };

  const checkLikeStatus = async () => {
    if (isCheckingLike) return;
    
    try {
      setIsCheckingLike(true);
      const response = await fetch(`/api/trpc/story.checkLikeStatus?input=${encodeURIComponent(JSON.stringify({ storyId: currentStory.id }))}`);
      const data = await response.json();
      setIsLiked(data.result?.data?.isLiked || false);
    } catch (error) {
    } finally {
      setIsCheckingLike(false);
    }
  };

  const handleLike = async () => {
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      await onLike(currentStory.id);
    } catch (error) {
      // Hata durumunda state'i geri al
      setIsLiked(!isLiked);
    }
  };


  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    setProgress(newProgress);
  };

  if (!currentStory) {
    return null;
  }

  const status = getStoryStatus(currentStory);
  const isVideo = currentStory.media_type === 'video';

  return (
    <div className={`fixed inset-0 z-[9999] bg-black ${className}`}>
      {/* Üst Bar - Progress ve Kapatma */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        {/* Progress Bar */}
        <div className="flex space-x-1 mb-4">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden"
              onClick={handleProgressClick}
            >
              <div
                className={`h-full transition-all duration-100 ${
                  index === currentStoryIndex
                    ? 'bg-white'
                    : index < currentStoryIndex
                    ? 'bg-white'
                    : 'bg-transparent'
                }`}
                style={{
                  width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Kapatma Butonu */}
        <div className="flex justify-between items-center">
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-2 text-white text-sm">
            <span>{currentStoryIndex + 1} / {stories.length}</span>
            <span className="text-gray-300">
              {(() => {
                const now = new Date();
                const storyDate = new Date(currentStory.created_at);
                const diffInHours = Math.floor((now.getTime() - storyDate.getTime()) / (1000 * 60 * 60));
                
                if (diffInHours < 1) {
                  return 'Az önce';
                } else if (diffInHours < 24) {
                  return `${diffInHours} saat önce`;
                } else {
                  const diffInDays = Math.floor(diffInHours / 24);
                  return `${diffInDays} gün önce`;
                }
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="relative w-full h-full">
        {/* Medya */}
        <div className="absolute inset-0">
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              className="w-full h-full object-cover"
              loop
              muted
              onEnded={handleNext}
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt={currentStory.caption || 'Hikaye'}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Overlay - Metin ve Efektler */}
        <div className="absolute inset-0">
          {/* Metin Overlay */}
          {currentStory.caption && (
            <div 
              className="absolute inset-0 flex items-center justify-center p-8"
              style={{
                background: `linear-gradient(45deg, ${currentStory.background_color}20, transparent)`
              }}
            >
              <p
                className="text-white text-center font-medium text-lg max-w-md"
                style={{
                  color: currentStory.text_color,
                  fontFamily: currentStory.font_family,
                  fontSize: `${currentStory.font_size}px`,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Video Kontrol Butonu */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-4"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
              </button>
            </div>
          )}
        </div>

        {/* Sol/Sağ Navigasyon */}
        <div className="absolute inset-y-0 left-0 w-1/3 flex items-center justify-start">
          <button
            onClick={handlePrevious}
            className="text-white hover:text-gray-300 transition-colors p-4"
            disabled={currentStoryIndex === 0}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        </div>

        <div className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end">
          <button
            onClick={handleNext}
            className="text-white hover:text-gray-300 transition-colors p-4"
            disabled={currentStoryIndex === stories.length - 1}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Alt Bar - Etkileşim Butonları */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between text-white">
          {/* Sol Taraf - İşletme Bilgisi */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-gray-700 font-medium text-sm">
                {currentStory.business_name?.charAt(0) || 'İ'}
              </span>
            </div>
            <div>
              <p className="font-medium">{currentStory.business_name || 'İşletme'}</p>
              <p className="text-sm text-gray-300">
                {new Date(currentStory.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>

          {/* Sağ Taraf - Etkileşim Butonları */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className={`transition-colors ${
                isLiked ? 'text-red-500' : 'text-white hover:text-red-500'
              }`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
