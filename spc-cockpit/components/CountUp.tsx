"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number | string;
  duration?: number;
  suffix?: string;
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

export function CountUp({ value, duration = 900, suffix = "" }: CountUpProps) {
  const numericValue = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  const isDecimal    = !Number.isInteger(numericValue);
  const displayStr   = typeof value === "string" ? value : value.toString();

  const [display, setDisplay] = useState("0");
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (isNaN(numericValue)) { setDisplay(displayStr); return; }

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed  = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutQuart(progress);
      const current  = numericValue * eased;

      setDisplay(
        isDecimal
          ? current.toFixed(1).replace(".", ",")
          : Math.round(current).toString()
      );

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [numericValue, duration, isDecimal, displayStr]);

  return <>{display}{suffix}</>;
}
