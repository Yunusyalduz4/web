"use client";
import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number; // Pull distance to trigger refresh (pixels)
  resistance?: number; // Resistance to pull (0-1, higher = more resistance)
  enabled?: boolean; // Enable/disable the feature
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  canPull: boolean; // Whether user can pull
  isPulling: boolean; // Whether currently pulling
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 0.4,
  enabled = true
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const isAtTop = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let startY = 0;
    let currentY = 0;
    let isMouseDown = false;

    const handleScroll = () => {
      isAtTop.current = window.scrollY <= 5;
    };

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      if (!isAtTop.current) return;
      
      startY = e.touches[0].clientY;
      currentY = e.touches[0].clientY;
      isMouseDown = true;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop.current || !isMouseDown) return;

      currentY = e.touches[0].clientY;
      const deltaY = Math.max(0, currentY - startY);
      const resistanceApplied = Math.min(deltaY * (1 - resistance), threshold * 1.5);
      
      setPullDistance(resistanceApplied);

      if (resistanceApplied > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isMouseDown) return;

      isMouseDown = false;
      setIsPulling(false);

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
    };

    // Mouse events for desktop
    const handleMouseDown = (e: MouseEvent) => {
      if (!isAtTop.current || e.target !== document.documentElement) return;
      
      startY = e.clientY;
      currentY = e.clientY;
      isMouseDown = true;
      setIsPulling(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isAtTop.current || !isMouseDown) return;

      currentY = e.clientY;
      const deltaY = Math.max(0, currentY - startY);
      const resistanceApplied = Math.min(deltaY * (1 - resistance), threshold * 1.5);
      
      setPullDistance(resistanceApplied);

      if (resistanceApplied > 0) {
        e.preventDefault();
      }
    };

    const handleMouseUp = async () => {
      if (!isMouseDown) return;

      isMouseDown = false;
      setIsPulling(false);

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
    };

    // Wheel events for desktop pull-to-refresh
    const handleWheel = (e: WheelEvent) => {
      if (!isAtTop.current) return;
      
      const isWheelDown = e.deltaY < 0 && 
        (pullDistance > 0 || 
         (e.clientY <= 100 && e.clientX <= window.innerWidth)); // Check if close to top
      
      if (isWheelDown) {
        const deltaY = Math.abs(e.deltaY) * 3;
        const resistanceApplied = Math.min(deltaY + pullDistance, threshold * 1.5);
        
        setPullDistance(resistanceApplied);
        e.preventDefault();
        
        if (resistanceApplied >= threshold) {
          handleTouchEnd();
        }
      }
    };

    // Initial scroll check
    handleScroll();

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: false });
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, pullDistance, threshold, resistance, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    canPull: enabled && !isRefreshing && isAtTop.current,
    isPulling
  };
}