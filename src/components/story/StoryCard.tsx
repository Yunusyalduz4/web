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

export function StoryGrid({ stories, onStoryClick, className = '' }: StoryGridProps) {
  const activeStories = stories.filter(story => {
    const isExpired = new Date(story.created_at).getTime() + (24 * 60 * 60 * 1000) < Date.now();
    return !isExpired;
  });

  if (activeStories.length === 0) {
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