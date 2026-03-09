"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useLockedBodyScroll, useReducedMotion, useViewportWidth } from "@/lib/client-hooks";

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
}: {
  items: T[];
  rowHeight: number;
  className?: string;
  itemClassName?: string;
  onActiveChange?: (index: number) => void;
  renderRow: RenderRow<T>;
  lockBody?: boolean;
  autoScrollSpeed?: number;
}) {
  useLockedBodyScroll(lockBody);
  const reducedMotion = useReducedMotion();
  useViewportWidth();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const dragStartRef = useRef(0);
  const dragOriginRef = useRef(0);
  const draggingRef = useRef(false);
  const lastNotifiedIndexRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const repeated = useMemo(() => [...items, ...items, ...items], [items]);
  const segmentHeight = items.length * rowHeight;

  useEffect(() => {
    if (!items.length || !innerRef.current || !viewportRef.current) {
      return;
    }

    currentRef.current = -segmentHeight;
    targetRef.current = -segmentHeight;
    gsap.set(innerRef.current, { y: currentRef.current });

    const tick = () => {
      const deltaSeconds = gsap.ticker.deltaRatio(60) / 60;
      if (!reducedMotion && autoScrollSpeed > 0 && !draggingRef.current) {
        targetRef.current -= autoScrollSpeed * deltaSeconds;
      }

      const factor = reducedMotion ? 1 : 0.13;
      currentRef.current += (targetRef.current - currentRef.current) * factor;

      while (currentRef.current > 0) {
        currentRef.current -= segmentHeight;
        targetRef.current -= segmentHeight;
      }

      while (currentRef.current < -segmentHeight * 2) {
        currentRef.current += segmentHeight;
        targetRef.current += segmentHeight;
      }

      gsap.set(innerRef.current, { y: currentRef.current });

      const viewportHeight = viewportRef.current?.offsetHeight ?? window.innerHeight;
      const centered = (-currentRef.current + viewportHeight / 2 - rowHeight / 2) / rowHeight;
      const nextIndex = ((Math.round(centered) % items.length) + items.length) % items.length;
      setActiveIndex((previous) => (previous === nextIndex ? previous : nextIndex));
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [autoScrollSpeed, items, onActiveChange, reducedMotion, rowHeight, segmentHeight]);

  useEffect(() => {
    if (lastNotifiedIndexRef.current === activeIndex) {
      return;
    }

    lastNotifiedIndexRef.current = activeIndex;
    onActiveChange?.(activeIndex);
  }, [activeIndex, onActiveChange]);

  useEffect(() => {
    const onMouseUp = () => {
      draggingRef.current = false;
    };
    const onTouchEnd = () => {
      draggingRef.current = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        targetRef.current -= rowHeight;
      }
      if (event.key === "ArrowUp") {
        targetRef.current += rowHeight;
      }
    };

    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rowHeight]);

  if (!items.length) {
    return null;
  }

  return (
    <div
      ref={viewportRef}
      className={className}
      onWheel={(event) => {
        targetRef.current -= event.deltaY * 0.25;
      }}
      onMouseDown={(event) => {
        draggingRef.current = true;
        dragStartRef.current = event.clientY;
        dragOriginRef.current = targetRef.current;
      }}
      onMouseMove={(event) => {
        if (!draggingRef.current) {
          return;
        }
        targetRef.current = dragOriginRef.current + (event.clientY - dragStartRef.current) * 1.5;
      }}
      onTouchStart={(event) => {
        draggingRef.current = true;
        dragStartRef.current = event.touches[0]?.clientY ?? 0;
        dragOriginRef.current = targetRef.current;
      }}
      onTouchMove={(event) => {
        if (!draggingRef.current) {
          return;
        }
        const nextY = event.touches[0]?.clientY ?? 0;
        targetRef.current = dragOriginRef.current + (nextY - dragStartRef.current) * 2;
      }}
    >
      <div ref={innerRef}>
        {repeated.map((item, index) => {
          const baseIndex = index % items.length;
          return (
            <div
              key={`${baseIndex}-${index}`}
              className={itemClassName}
              style={{ height: `${rowHeight}px` }}
              data-active={String(baseIndex === activeIndex)}
            >
              {renderRow(item, baseIndex, baseIndex === activeIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
