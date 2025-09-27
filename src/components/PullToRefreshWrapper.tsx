"use client";
import { ReactNode, useEffect, useState } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshWrapperProps {
  children: ReactNode;
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
  showVisualIndicator?: boolean;
}

export default function PullToRefreshWrapper({
  children,
  onRefresh,
  threshold = 80,
  resistance = 0.6,
  enabled = true,
  showVisualIndicator = true
}: PullToRefreshWrapperProps) {
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh,
    threshold,
    resistance,
    enabled
  });

  const [showIndicator, setShowIndicator] = useState(false);
  
  const progressComplete = Math.min(pullDistance / threshold, 1);
  const isAtThreshold = pullDistance >= threshold;

  useEffect(() => {
    if (pullDistance > 15) {
      setShowIndicator(true);
    } else {
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pullDistance]);

  return (
    <div className="relative overflow-hidden">
      {/* Sadece Refresh Icon */}
      {enabled && showVisualIndicator && showIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 z-40 pointer-events-none flex items-center justify-center py-4"
          style={{ 
            transform: `translateY(${Math.max(0, pullDistance - 15)}px)`,
            opacity: showIndicator ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-gray-200">
            <div className="w-6 h-6">
              {isRefreshing ? (
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg 
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isAtThreshold ? 'text-green-500' : 'text-blue-500'
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="transition-all duration-300 ease-out">
        {children}
      </div>
    </div>
  );
}