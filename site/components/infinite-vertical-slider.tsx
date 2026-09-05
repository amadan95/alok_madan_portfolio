"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useLockedBodyScroll, useReducedMotion } from "@/lib/client-hooks";

type RenderRow<T> = (item: T, index: number, isActive: boolean) => ReactNode;

export function InfiniteVerticalSlider<T>({
  items,
  rowHeight,
  className,
  itemClassName,
  onActiveChange,
  renderRow,
  lockBody = true,
  autoScrollSpeed = 0,
  maxRenderedRows,
}: {
  items: T[];
  rowHeight: number;
  className?: string;
  itemClassName?: string;
  onActiveChange?: (index: number) => void;
  renderRow: RenderRow<T>;
  lockBody?: boolean;
  autoScrollSpeed?: number;
  maxRenderedRows?: number;
}) {
  const reducedMotion = useReducedMotion();
  useLockedBodyScroll(lockBody && !reducedMotion);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const speedRef = useRef(autoScrollSpeed);
  const viewportHeightRef = useRef(0);
  const dragStartRef = useRef(0);
  const dragOriginRef = useRef(0);
  const draggingRef = useRef(false);
  const onActiveChangeRef = useRef(onActiveChange);
  const lastNotifiedIndexRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeRepeatedIndex, setActiveRepeatedIndex] = useState(items.length);
  const repeated = useMemo(() => [...items, ...items, ...items], [items]);
  const segmentHeight = items.length * rowHeight;

  useEffect(() => { speedRef.current = autoScrollSpeed; }, [autoScrollSpeed]);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);

  useEffect(() => {
    if (reducedMotion || !items.length || !innerRef.current || !viewportRef.current) return;
    currentRef.current = -segmentHeight;
    targetRef.current = -segmentHeight;
    viewportHeightRef.current = viewportRef.current.offsetHeight || window.innerHeight;
    gsap.set(innerRef.current, { y: currentRef.current });

    const measure = () => {
      viewportHeightRef.current = viewportRef.current?.offsetHeight || window.innerHeight;
    };
    const tick = () => {
      if (document.hidden) return;
      const deltaSeconds = gsap.ticker.deltaRatio(60) / 60;
      if (speedRef.current > 0 && !draggingRef.current) targetRef.current -= speedRef.current * deltaSeconds;
      currentRef.current += (targetRef.current - currentRef.current) * 0.13;

      while (currentRef.current > 0) {
        currentRef.current -= segmentHeight;
        targetRef.current -= segmentHeight;
      }
      while (currentRef.current < -segmentHeight * 2) {
        currentRef.current += segmentHeight;
        targetRef.current += segmentHeight;
      }

      gsap.set(innerRef.current, { y: currentRef.current });
      const centered = (-currentRef.current + viewportHeightRef.current / 2 - rowHeight / 2) / rowHeight;
      const repeatedIndex = Math.max(0, Math.min(repeated.length - 1, Math.round(centered)));
      const nextIndex = ((repeatedIndex % items.length) + items.length) % items.length;
      setActiveRepeatedIndex((previous) => previous === repeatedIndex ? previous : repeatedIndex);
      setActiveIndex((previous) => previous === nextIndex ? previous : nextIndex);
    };

    window.addEventListener("resize", measure, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("resize", measure);
      gsap.ticker.remove(tick);
    };
  }, [items, reducedMotion, repeated.length, rowHeight, segmentHeight]);

  useEffect(() => {
    if (lastNotifiedIndexRef.current === activeIndex) return;
    lastNotifiedIndexRef.current = activeIndex;
    onActiveChangeRef.current?.(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (reducedMotion) return;
    const stopDragging = () => { draggingRef.current = false; };
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchend", stopDragging);
    return () => {
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchend", stopDragging);
    };
  }, [reducedMotion]);

  if (!items.length) return null;

  if (reducedMotion) {
    return (
      <div ref={viewportRef} className={className} data-reduced-motion="true" tabIndex={0}>
        <div ref={innerRef}>
          {items.map((item, index) => (
            <div key={index} className={itemClassName} style={{ minHeight: `${rowHeight}px` }} data-active={String(index === activeIndex)}>
              {renderRow(item, index, index === activeIndex)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visibleWindow = typeof maxRenderedRows === "number" && maxRenderedRows > 0 ? {
    start: Math.max(0, activeRepeatedIndex - Math.floor(maxRenderedRows / 2)),
    end: Math.min(repeated.length, activeRepeatedIndex + Math.ceil(maxRenderedRows / 2)),
  } : null;
  const renderItems = visibleWindow
    ? repeated.slice(visibleWindow.start, visibleWindow.end).map((item, offset) => ({ item, index: visibleWindow.start + offset }))
    : repeated.map((item, index) => ({ item, index }));

  return (
    <div
      ref={viewportRef}
      className={className}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); targetRef.current -= rowHeight; }
        if (event.key === "ArrowUp") { event.preventDefault(); targetRef.current += rowHeight; }
      }}
      onWheel={(event) => { targetRef.current -= event.deltaY * 0.25; }}
      onMouseDown={(event) => {
        draggingRef.current = true;
        dragStartRef.current = event.clientY;
        dragOriginRef.current = targetRef.current;
      }}
      onMouseMove={(event) => {
        if (draggingRef.current) targetRef.current = dragOriginRef.current + (event.clientY - dragStartRef.current) * 1.5;
      }}
      onTouchStart={(event) => {
        draggingRef.current = true;
        dragStartRef.current = event.touches[0]?.clientY ?? 0;
        dragOriginRef.current = targetRef.current;
      }}
      onTouchMove={(event) => {
        if (draggingRef.current) targetRef.current = dragOriginRef.current + ((event.touches[0]?.clientY ?? 0) - dragStartRef.current) * 2;
      }}
    >
      <div ref={innerRef} style={visibleWindow ? { position: "relative", height: `${repeated.length * rowHeight}px` } : undefined}>
        {renderItems.map(({ item, index }) => {
          const baseIndex = index % items.length;
          return (
            <div key={`${baseIndex}-${index}`} className={itemClassName} style={visibleWindow ? { height: `${rowHeight}px`, position: "absolute", top: `${index * rowHeight}px`, left: 0, right: 0 } : { height: `${rowHeight}px` }} data-active={String(baseIndex === activeIndex)}>
              {renderRow(item, baseIndex, baseIndex === activeIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
