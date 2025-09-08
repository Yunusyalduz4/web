'use client';

import React from 'react';
import { Story, StoryDetailedStats } from '../../types/story';
import { Eye, Heart, MessageCircle, Share, Clock, TrendingUp } from 'lucide-react';

interface StoryStatsProps {
  story: Story;
  detailedStats?: StoryDetailedStats;
  showDetails?: boolean;
  className?: string;
}

export default function StoryStats({ 
  story, 
  detailedStats, 
  showDetails = false,
  className = ''
}: StoryStatsProps) {
  const engagementRate = story.view_count > 0 
    ? ((story.like_count + story.comment_count + story.share_count) / story.view_count * 100).toFixed(1)
    : '0';

  return (
    <div className={`bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/40 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Hikaye İstatistikleri</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {new Date(story.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* Ana İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{story.view_count}</span>
          </div>
          <p className="text-sm text-gray-600">Görüntülenme</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">{story.like_count}</span>
          </div>
          <p className="text-sm text-gray-600">Beğeni</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{story.comment_count}</span>
          </div>
          <p className="text-sm text-gray-600">Yorum</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Share className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">{story.share_count}</span>
          </div>
          <p className="text-sm text-gray-600">Paylaşım</p>
        </div>
      </div>

      {/* Etkileşim Oranı */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">Etkileşim Oranı</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">{engagementRate}%</span>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, parseFloat(engagementRate))}%` }}
          />
        </div>
      </div>

      {/* Detaylı İstatistikler */}
      {showDetails && detailedStats && (
        <div className="space-y-4">
          {/* Son Görüntüleyenler */}
          {detailedStats.views.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Son Görüntüleyenler</h4>
              <div className="space-y-2">
                {detailedStats.views.slice(0, 5).map((view, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{view.viewer_name || 'Anonim'}</span>
                    <span className="text-gray-400">
                      {new Date(view.viewed_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Son Beğenenler */}
          {detailedStats.likes.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Son Beğenenler</h4>
              <div className="space-y-2">
                {detailedStats.likes.slice(0, 5).map((like, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{like.liker_name || 'Anonim'}</span>
                    <span className="text-gray-400">
                      {new Date(like.liked_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Son Yorumlar */}
          {detailedStats.comments.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Son Yorumlar</h4>
              <div className="space-y-2">
                {detailedStats.comments.slice(0, 3).map((comment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.commenter_name || 'Anonim'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
