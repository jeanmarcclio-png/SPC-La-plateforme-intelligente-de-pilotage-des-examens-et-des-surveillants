"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

const THRESHOLD = 65;
const MAX_PULL = 100;

export function PullToRefresh() {
  const [pull, setPull]           = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY   = useRef(0);
  const active   = useRef(false);
  const router   = useRouter();
  const pathname = usePathname();

  // Reset on navigation
  useEffect(() => {
    setPull(0);
    setRefreshing(false);
    active.current = false;
  }, [pathname]);

  const getScrollEl = useCallback(() =>
    document.querySelector("main") as HTMLElement | null, []);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      const el = getScrollEl();
      if (el && el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        active.current = true;
      }
    }

    function onMove(e: TouchEvent) {
      if (!active.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPull(Math.min(dy * 0.45, MAX_PULL));
      } else {
        active.current = false;
        setPull(0);
      }
    }

    function onEnd() {
      if (!active.current) return;
      active.current = false;
      setPull((prev) => {
        if (prev >= THRESHOLD) {
          setRefreshing(true);
          router.refresh();
          setTimeout(() => { setRefreshing(false); setPull(0); }, 1200);
          return THRESHOLD; // hold at threshold during refresh
        }
        return 0;
      });
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove",  onMove,  { passive: true });
    document.addEventListener("touchend",   onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove",  onMove);
      document.removeEventListener("touchend",   onEnd);
    };
  }, [router, refreshing, getScrollEl]);

  if (pull === 0 && !refreshing) return null;

  const opacity  = Math.min(pull / THRESHOLD, 1);
  const rotation = refreshing ? 0 : pull * 3.6;
  const height   = refreshing ? 52 : pull;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-end justify-center pointer-events-none md:hidden"
      style={{ height, transition: refreshing ? "height 0.2s ease" : "none" }}
    >
      <div
        className="w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center mb-2"
        style={{
          opacity,
          transform: refreshing ? "none" : `rotate(${rotation}deg)`,
          animation: refreshing ? "spin 0.7s linear infinite" : "none",
        }}
      >
        <RotateCcw className="w-[18px] h-[18px] text-[var(--color-primary)]" strokeWidth={2.5} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
