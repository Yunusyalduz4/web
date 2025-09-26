"use client";
import { ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshWrapperProps {
  children: ReactNode;
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

export default function PullToRefreshWrapper({
  children,
  onRefresh,
  threshold = 80,
  resistance = 0.4,
  enabled = true
}: PullToRefreshWrapperProps) {
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh,
    threshold,
    resistance,
    enabled
  });

  const progressOpacity = Math.min(pullDistance / 80, 1);
  const shouldShowIndicator = pullDistance > 20;

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      {enabled && shouldShowIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 z-40 transition-all duration-200"
          style={{ 
            transform: `translateY(${Math.max(0, pullDistance - 20)}px)`
          }}
        >
          <div className="flex items-center justify-center py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="bg-white/95 backdrop-blur-md border border-blue-200 rounded-full p-3 shadow-lg">
              <div
                className={`w-6 h-6 rounded-full border-2 transition-colors duration-200 ${
                  isRefreshing
                    ? 'border-blue-500 border-t-transparent animate-spin'
                    : isPulling && pullDistance >= threshold
                    ? 'border-green-500 border-t-transparent animate-spin'
                    : isPulling
                    ? 'border-blue-400'
                    : 'border-gray-300'
                }`}
              >
                {isRefreshing && (
                  <div className="w-4 h-4 mx-auto mt-0.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>
            <div className="ml-3 text-sm font-medium text-blue-600">
              {isRefreshing ? (
                'Yenileniyor...'
              ) : pullDistance >= threshold ? (
                'Bırakın, yenilensin'
              ) : isPulling ? (
                'Yukarı çekin'
              ) : (
                'Yenilemek için'
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div 
        className="relative transition-all duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance * 0.3}px)`,
          opacity: isRefreshing ? 0.7 : 1
        }}
      >
        {children}
      </div>
    </div>
  );
}
