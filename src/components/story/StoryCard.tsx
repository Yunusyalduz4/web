'use client';

import React from 'react';
import { Story } from '../../types/story';
import { Clock, Eye, Heart, MessageCircle, Share } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  onClick: () => void;
  className?: string;
}

interface StoryGridProps {
  stories: Story[];
  onStoryClick: (story: Story, index: number) => void;
  className?: string;
}

export function StoryCard({ story, onClick, className = '' }: StoryCardProps) {
  const isExpired = new Date(story.created_at).getTime() + (24 * 60 * 60 * 1000) < Date.now();
  
  if (isExpired) return null;

  return (
    <div 
      className={`relative cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* Hikaye Border */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-0.5">
        <div className="w-full h-full rounded-full overflow-hidden bg-white">
          {story.media_type === 'image' ? (
            <img
              src={story.media_url}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={story.media_url}
              className="w-full h-full object-cover"
              muted
            />
          )}
        </div>
      </div>


      {/* Süre Göstergesi */}
      <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
        <Clock className="w-3 h-3" />
      </div>
    </div>
  );
}

interface StoryGridProps {
  stories: Story[];
  onStoryClick: (story: Story, index: number) => void;
  onAddStory?: () => void;
  showAddButton?: boolean;
  className?: string;
}

export function StoryGrid({ stories, onStoryClick, onAddStory, showAddButton = false, className = '' }: StoryGridProps) {
  const activeStories = stories.filter(story => {
    const isExpired = new Date(story.created_at).getTime() + (24 * 60 * 60 * 1000) < Date.now();
    return !isExpired;
  });

  if (activeStories.length === 0 && !showAddButton) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-500 text-sm">
          Henüz hikaye paylaşılmamış
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-4 overflow-x-auto pb-2 ${className}`}>
      {/* Hikaye Ekleme Butonu */}
      {showAddButton && onAddStory && (
        <div 
          className="relative cursor-pointer group flex-shrink-0"
          onClick={onAddStory}
        >
          {/* Hikaye Ekleme Border - Mevcut hikayeler gibi gradient */}
          <div 
            className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-0.5"
            style={{
              borderImage: 'linear-gradient(45deg, #8b5cf6, #ec4899, #ef4444) 1',
              border: '2px solid transparent',
              background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #8b5cf6, #ec4899, #ef4444) border-box'
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center hover:bg-gray-50 transition-all duration-200 group-hover:scale-105">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5"
                className="text-gray-600 group-hover:text-gray-800 transition-colors"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Mevcut Hikayeler */}
      {activeStories.map((story, index) => (
        <StoryCard
          key={story.id}
          story={story}
          onClick={() => onStoryClick(story, index)}
        />
      ))}
    </div>
  );
}

export default StoryCard;