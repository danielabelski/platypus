import { useRef, useState, useCallback, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startScrollTopRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const isHorizontalRef = useRef(false);
  const firstMoveRef = useRef(true);
  // Mirror pullDistance to a ref so touchend can read current value
  const pullDistanceRef = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    startScrollTopRef.current = containerRef.current?.scrollTop ?? 0;
    isHorizontalRef.current = false;
    firstMoveRef.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshingRef.current) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;
      const deltaX = touch.clientX - startXRef.current;

      if (firstMoveRef.current) {
        firstMoveRef.current = false;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isHorizontalRef.current = true;
          return;
        }
      }

      if (isHorizontalRef.current) return;
      if (startScrollTopRef.current !== 0) return;
      if (deltaY <= 0) return;

      e.preventDefault();
      const resistance = Math.min(deltaY * 0.45, maxPullDistance);
      pullDistanceRef.current = resistance;
      setIsPulling(true);
      setPullDistance(resistance);
    },
    [disabled, maxPullDistance],
  );

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshingRef.current) return;

    const currentPullDistance = pullDistanceRef.current;

    if (currentPullDistance >= threshold) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      setIsPulling(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    } else {
      setIsPulling(false);
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [threshold, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pullDistance, isRefreshing, isPulling };
}
