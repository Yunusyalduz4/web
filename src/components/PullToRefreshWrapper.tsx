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
  refreshColor?: string;
}

export default function PullToRefreshWrapper({
  children,
  onRefresh,
  threshold = 80,
  resistance = 0.6,
  enabled = true,
  showVisualIndicator = true,
  refreshColor = 'slate'
}: PullToRefreshWrapperProps) {
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh,
    threshold,
    resistance,
    enabled
  });

  const [showIndicator, setShowIndicator] = useState(false);
  const [indicatorOpacity, setIndicatorOpacity] = useState(0);
  
  const progressComplete = Math.min(pullDistance / threshold, 1);
  const progressAngle = progressComplete * 360;
  const isAtThreshold = pullDistance >= threshold;

  useEffect(() => {
    if (pullDistance > 15) {
      setShowIndicator(true);
      setIndicatorOpacity(1);
    } else {
      const timer = setTimeout(() => {
        setShowIndicator(false);
        setIndicatorOpacity(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pullDistance]);

  const colorClass = refreshColor === 'slate' 
    ? 'bg-slate-50 border-slate-200 text-slate-600' 
    : refreshColor === 'blue'
    ? 'bg-blue-50 border-blue-200 text-blue-600'
    : 'bg-purple-50 border-purple-200 text-purple-600';

  const gradientClass = refreshColor === 'slate'
    ? 'from-slate-50 to-gray-50'
    : refreshColor === 'blue'
    ? 'from-blue-50 to-indigo-50'
    : 'from-purple-50 to-pink-50';

  const spinnerColor = refreshColor === 'slate'
    ? 'border-slate-500'
    : refreshColor === 'blue'
    ? 'border-blue-500'
    : 'border-purple-500';

  // Calculate transform and color states
  const transform = Math.max(0, pullDistance / 8);
  const scaleDown = 0.98 + (progressComplete * 0.02);
  const blurEffect = isRefreshing ? 'blur(2px)' : isPulling ? 'blur(1px)' : 'blur(0)';

  return (
    <div className="relative overflow-hidden">
      {/* Enhanced Pull to Refresh Indicator */}
      {enabled && showVisualIndicator && (
        <div 
          className={`absolute top-0 left-0 right-0 transition-all duration-300 z-40 pointer-events-none ${
            showIndicator ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            transform: `translateY(${Math.max(0, pullDistance - 15)}px)`,
            opacity: indicatorOpacity,
            transition: 'opacity 300ms ease-out'
          }}
        >
          <div className={`h-full flex items-center justify-center py-4 bg-gradient-to-r ${gradientClass}`}>
            <div className="flex items-center justify-center">
              {/* Enhanced Progress Spinner */}
              <div className="relative mr-4">
                <div className={`w-12 h-12 rounded-full border-4 border-white/40 transition-all duration-200`}>
                  <div 
                    className={`w-full h-full rounded-full border-4 border-transparent ${spinnerColor} border-t-${isRefreshing || isAtThreshold ? 'opacity-100' : 'opacity-70'}`}
                    style={{
                      transform: `rotate(${isRefreshing ? progressAngle : progressAngle}deg)`,
                      transition: isRefreshing ? 'transform 0.1s linear' : 'transform 0.3s ease-out'
                    }}
                  />
                  {isRefreshing && (
                    <div className={`absolute inset-0 rounded-full border-4 border-transparent ${spinnerColor} animate-spin border-t-opacity-100`} />
                  )}
                </div>
                {/* Glow effect */}
                {isAtThreshold && (
                  <div className={`absolute -inset-1 ${colorClass} opacity-50 blur-sm animate-pulse`} />
                )}
              </div>
              
              {/* Enhanced Status Text */}
              <div className="flex flex-col items-center">
                <div className={`text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isRefreshing 
                    ? `${refreshColor === 'slate' ? 'text-slate-600' : refreshColor === 'blue' ? 'text-blue-600' : 'text-purple-600'} animate-pulse`
                    : isAtThreshold 
                    ? 'text-green-600 font-bold' 
                    : 'text-gray-600'
                }`}>
                  {isRefreshing 
                    ? '🎯 Yenileniyor...'
                    : isAtThreshold 
                    ? '✅ Bırakın!' 
                    : progressComplete > 0.5
                    ? '⏳ Biraz daha...'
                    : '⬇️ Yukarı çekin'
                  }
                </div>
                {/* Progress bar mini */}
                <div className="w-8 h-1 bg-white/60 rounded-full mt-1 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-200 ${
                      isRefreshing || isAtThreshold ? 'bg-green-500' : 'bg-blue-400'
                    }`}
                    style={{
                      width: `${Math.min(progressComplete * 100, 100)}%`,
                      transition: 'width 200ms ease-out'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Content with Advanced Animations */}
      <div 
        className="transition-all duration-300 ease-out"
        style={{
          transform: `translateY(${transform}px) scale(${scaleDown})`,
          filter: blurEffect,
          zIndex: 10
        }}
      >
        {/* Additional overlay for better visual separation during refresh */}
        {isRefreshing && (
          <div className="fixed inset-0 bg-black/10 pointer-events-none z-20" style={{
            animation: 'fadeIn 300ms ease-out'
          }} />
        )}
        {children}
      </div>

      {/* Custom CSS injection for enhanced performance */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}