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

  return (
    <div
      className={
        "h-scroll-wrap" +
        (hideScrollbar ? " h-scroll-wrap--hide-scrollbar" : "")
      }
    >
      {canScrollLeft && (
        <button
          type="button"
          className="h-scroll-btn h-scroll-btn--left"
          onClick={() =>
            scrollRef.current?.scrollBy({
              left: -scrollAmount,
              behavior: "smooth",
            })
          }
          aria-label="Scroll left"
        >
          ‹
        </button>
      )}
      <div
        className={trackClassName + " scroll-track"}
        ref={scrollRef}
        onScroll={updateScrollState}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          className="h-scroll-btn h-scroll-btn--right"
          onClick={() =>
            scrollRef.current?.scrollBy({
              left: scrollAmount,
              behavior: "smooth",
            })
          }
          aria-label="Scroll right"
        >
          ›
        </button>
      )}
    </div>
  );
}

export default HorizontalScrollContainer;
