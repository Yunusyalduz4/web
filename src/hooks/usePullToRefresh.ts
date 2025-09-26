"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
  disabledScrollKey?: string[];
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  canPull: boolean;
  isPulling: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 0.6,
  enabled = true,
  disabledScrollKey = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End']
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const isAtTop = useRef(false);
  const startY = useRef(0);
  const isPointerDown = useRef(false);
  const animationFrame = useRef<number | undefined>(undefined);

  const resetPullDistance = () => setPullDistance(0);

  const executeRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        resetPullDistance();
      }, 500);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const updateScrollPosition = () => {
      isAtTop.current = window.scrollY <= 5;
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (!isAtTop.current || isRefreshing) return;
      
      startY.current = e.touches[0].clientY;
      isPointerDown.current = true;
      setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPointerDown.current || !isAtTop.current) return;
      
      const clientY = e.touches[0].clientY;
      const deltaY = Math.max(0, clientY - startY.current);
      const appliedResistance = Math.min(deltaY * (1 - resistance), threshold * 2);
      
      if (appliedResistance > 10) {
        e.preventDefault();
        setPullDistance(appliedResistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPointerDown.current) return;
      
      isPointerDown.current = false;
      setIsPulling(false);
      
      if (pullDistance >= threshold) {
        await executeRefresh();
      }
      
      // Smooth reset
      const resetDistance = pullDistance;
      let currentReset = resetDistance;
      const resetStep = resetDistance / 10;
      
      const animateReset = () => {
        currentReset -= resetStep;
        if (currentReset > 0) {
          setPullDistance(currentReset);
          animationFrame.current = requestAnimationFrame(animateReset);
        } else {
          resetPullDistance();
        }
      };
      
      if (resetDistance > 0) {
        animationFrame.current = requestAnimationFrame(animateReset);
      }
    };

    // Mouse events for desktop
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && isAtTop.current && !isRefreshing) {
        startY.current = e.clientY;
        isPointerDown.current = true;
        setIsPulling(true);
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerDown.current && isAtTop.current) {
        const deltaY = Math.max(0, e.clientY - startY.current);
        const appliedResistance = Math.min(deltaY * (1 - resistance), threshold * 2);
        
        if (appliedResistance > 10) {
          e.preventDefault();
          setPullDistance(appliedResistance);
        }
      }
    };

    const handleMouseUp = () => {
      if (!isPointerDown.current) return;
      
      isPointerDown.current = false;
      setIsPulling(false);
      
      if (pullDistance >= threshold) {
        executeRefresh();
      }
      
      const resetDistance = pullDistance;
      let currentReset = resetDistance;
      const resetStep = resetDistance / 10;
      
      const animateReset = () => {
        currentReset -= resetStep;
        if (currentReset > 0) {
          setPullDistance(currentReset);
          animationFrame.current = requestAnimationFrame(animateReset);
        } else {
          resetPullDistance();
        }
      };
      
      if (resetDistance > 0) {
        animationFrame.current = requestAnimationFrame(animateReset);
      }
    };

    // Wheel tracking for desktop refinement
    const handleWheel = (e: WheelEvent) => {
      if (isAtTop.current && e.deltaY < 0) {
        const wheelDelta = Math.abs(e.deltaY);
        const currentPull = pullDistance;
        const newPull = Math.min(currentPull + wheelDelta * 2, threshold * 1.5);
        
        setPullDistance(newPull);
        e.preventDefault();
        
        if (newPull >= threshold) {
          executeRefresh();
        }
      }
    };

    // Keyboard lock mechanism
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabledScrollKey.includes(e.key)) {
        setIsPulling(false);
        resetPullDistance();
        isPointerDown.current = false;
      }
    };

    updateScrollPosition();

    // Event registration
    window.addEventListener('scroll', updateScrollPosition, { passive: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('mousedown', handleMouseDown, { passive: false });
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    // Block scrolling when pull is activate
    const handlePassive = (e: Event) => {
      if (isPulling) {
        e.preventDefault();
      }
    };

    window.addEventListener('scroll', handlePassive, { passive: false });
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      
      window.removeEventListener('scroll', updateScrollPosition);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handlePassive);
    };
  }, [enabled, onRefresh, pullDistance, threshold, isPulling, resistance, disabledScrollKey, isRefreshing]);

  return {
    isRefreshing,
    pullDistance,
    canPull: enabled && !isRefreshing && isAtTop.current,
    isPulling
  };
}