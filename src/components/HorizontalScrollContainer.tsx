import { useState, useEffect, useRef } from "react";

function HorizontalScrollContainer({
  children,
  scrollAmount = 192,
  trackClassName,
  hideScrollbar = false,
}: {
  children: React.ReactNode;
  scrollAmount?: number;
  trackClassName?: string;
  hideScrollbar?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    requestAnimationFrame(updateScrollState);
  }, [children]);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: scrollAmount, behavior: "smooth" });

  return (
    <div className={"h-scroll-wrap" + (hideScrollbar ? " h-scroll-wrap--hide-scrollbar" : "")}>
      {/* Desktop: buttons are absolute overlays via CSS */}
      {canScrollLeft && (
        <button type="button" className="h-scroll-btn h-scroll-btn--left h-scroll-btn--overlay" onClick={scrollLeft} aria-label="Scroll left">
          ‹
        </button>
      )}
      <div className={trackClassName + " scroll-track"} ref={scrollRef} onScroll={updateScrollState}>
        {children}
      </div>
      {canScrollRight && (
        <button type="button" className="h-scroll-btn h-scroll-btn--right h-scroll-btn--overlay" onClick={scrollRight} aria-label="Scroll right">
          ›
        </button>
      )}
      {/* Mobile: buttons rendered below the track as a row */}
      {(canScrollLeft || canScrollRight) && (
        <div className="h-scroll-btns-mobile">
          <button
            type="button"
            className="h-scroll-btn-mobile"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button
            type="button"
            className="h-scroll-btn-mobile"
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default HorizontalScrollContainer;
