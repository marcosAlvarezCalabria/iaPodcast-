"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface WheelPickerOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface WheelPickerProps {
  options: WheelPickerOption[];
  value: string;
  onChange: (value: string) => void;
  itemHeight?: number;
  visibleItems?: number;
}

export function WheelPicker({
  options,
  value,
  onChange,
  itemHeight = 44,
  visibleItems = 5,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const animationFrame = useRef<number | null>(null);

  const totalHeight = itemHeight * visibleItems;
  const paddingItems = Math.floor(visibleItems / 2);

  // Find current index
  const currentIndex = options.findIndex((opt) => opt.value === value);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  // Scroll to selected item
  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      const targetScroll = index * itemHeight;
      if (smooth) {
        containerRef.current.scrollTo({
          top: targetScroll,
          behavior: "smooth",
        });
      } else {
        containerRef.current.scrollTop = targetScroll;
      }
    },
    [itemHeight]
  );

  // Initial scroll to selected value
  useEffect(() => {
    scrollToIndex(safeIndex, false);
  }, [safeIndex, scrollToIndex]);

  // Handle scroll end - snap to nearest item
  const handleScrollEnd = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const nearestIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(nearestIndex, options.length - 1));

    scrollToIndex(clampedIndex, true);

    if (options[clampedIndex] && options[clampedIndex].value !== value) {
      onChange(options[clampedIndex].value);
    }
  }, [itemHeight, options, value, onChange, scrollToIndex]);

  // Debounced scroll handler
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = useCallback(() => {
    if (isDragging) return;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(handleScrollEnd, 100);
  }, [handleScrollEnd, isDragging]);

  // Touch/Mouse handlers for smooth dragging
  const handleDragStart = useCallback((clientY: number) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    startY.current = clientY;
    startScrollTop.current = containerRef.current.scrollTop;
    velocity.current = 0;
    lastY.current = clientY;
    lastTime.current = Date.now();
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
  }, []);

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging || !containerRef.current) return;
      const deltaY = startY.current - clientY;
      containerRef.current.scrollTop = startScrollTop.current + deltaY;

      // Calculate velocity
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        velocity.current = (lastY.current - clientY) / dt;
      }
      lastY.current = clientY;
      lastTime.current = now;
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Apply momentum
    const decelerate = () => {
      if (!containerRef.current || Math.abs(velocity.current) < 0.01) {
        handleScrollEnd();
        return;
      }
      containerRef.current.scrollTop += velocity.current * 16;
      velocity.current *= 0.92; // Friction
      animationFrame.current = requestAnimationFrame(decelerate);
    };

    if (Math.abs(velocity.current) > 0.5) {
      decelerate();
    } else {
      handleScrollEnd();
    }
  }, [isDragging, handleScrollEnd]);

  // Event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => handleDragStart(e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onMouseLeave = () => {
      if (isDragging) handleDragEnd();
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", onMouseLeave);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("mouseleave", onMouseLeave);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd, isDragging]);

  // Calculate item styles based on position
  const getItemStyle = (index: number) => {
    if (!containerRef.current) return {};
    const scrollTop = containerRef.current.scrollTop;
    const itemCenter = index * itemHeight + itemHeight / 2;
    const containerCenter = scrollTop + totalHeight / 2;
    const distance = (itemCenter - containerCenter) / itemHeight;

    // 3D rotation effect
    const rotateX = distance * 18;
    const scale = 1 - Math.abs(distance) * 0.1;
    const opacity = 1 - Math.abs(distance) * 0.3;
    const translateZ = -Math.abs(distance) * 10;

    return {
      transform: `perspective(200px) rotateX(${rotateX}deg) scale(${Math.max(scale, 0.8)}) translateZ(${translateZ}px)`,
      opacity: Math.max(opacity, 0.3),
    };
  };

  // Force re-render on scroll for 3D effect
  const [, setScrollPosition] = useState(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      setScrollPosition(container.scrollTop);
      handleScroll();
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  return (
    <div
      className="relative overflow-hidden select-none bg-[#2a2218]"
      style={{ height: totalHeight }}
    >
      {/* Gradient overlays for fade effect */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#2a2218] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2a2218] to-transparent z-10 pointer-events-none" />

      {/* Selection highlight */}
      <div
        className="absolute inset-x-2 z-0 bg-primary/20 rounded-lg border-y-2 border-primary/40"
        style={{
          top: paddingItems * itemHeight,
          height: itemHeight,
        }}
      />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll no-scrollbar cursor-grab active:cursor-grabbing"
        style={{
          paddingTop: paddingItems * itemHeight,
          paddingBottom: paddingItems * itemHeight,
        }}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            className="flex items-center justify-center transition-transform duration-75"
            style={{
              height: itemHeight,
              ...getItemStyle(index),
            }}
            onClick={() => {
              scrollToIndex(index, true);
              onChange(option.value);
            }}
          >
            <div className="text-center">
              <span
                className={`text-base font-bold transition-colors ${
                  option.value === value ? "text-primary" : "text-[#e8ddd0]"
                }`}
              >
                {option.label}
              </span>
              {option.sublabel && (
                <span className="block text-xs text-[#8a7a6a]">{option.sublabel}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
