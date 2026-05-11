import { useState } from "react";

const SLIDES = [
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4v40l4-2 4 2 4-2 4 2 4-2 4 2 4-2 4 2V4l-4 2-4-2-4 2-4-2-4 2-4-2-4 2z" />
        <line x1="17" y1="16" x2="31" y2="16" />
        <line x1="17" y1="22" x2="31" y2="22" />
        <line x1="17" y1="28" x2="25" y2="28" />
      </svg>
    ),
    title: "Welcome to Quote Calculator",
    body: "A professional quoting tool built for auto repair shops. Create detailed estimates, manage customers and vendors, track your parts inventory, and print branded quotes — all from one place.",
    note: "Everything you enter stays on this device. No account, no server, no subscription. Your quotes, customers, and inventory are saved in your browser's local storage and never leave your machine.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="8" width="36" height="32" rx="3" />
        <line x1="14" y1="18" x2="34" y2="18" />
        <line x1="14" y1="24" x2="34" y2="24" />
        <line x1="14" y1="30" x2="24" y2="30" />
        <path d="M30 28l4 4-4 4" />
      </svg>
    ),
    title: "Build Quotes Fast",
    body: "Each quote supports multiple jobs — each with its own parts list, labor hours, and notes. Tax, shop supplies, and discounts calculate automatically as you build. When you're done, print a clean quote sheet with your shop's name, logo, and contact information.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="6" width="28" height="36" rx="3" />
        <path d="M18 6v6h12V6" />
        <line x1="16" y1="22" x2="32" y2="22" />
        <line x1="16" y1="28" x2="32" y2="28" />
        <circle cx="16" cy="22" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="28" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    title: "Templates & Quick Jobs",
    body: "Save any job as a reusable template organized by service category. Mark your most-used services as Quick Jobs — they appear as one-click shortcuts directly on the quote screen. Templates can include flexible part slots that pull from your inventory automatically when applied.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="16" r="6" />
        <path d="M6 38c0-7 6-12 12-12s12 5 12 12" />
        <path d="M32 20c3.3 0 6 2.7 6 6s-2.7 6-6 6" />
        <path d="M38 38c0-4.4-2.7-8-6-9.5" />
      </svg>
    ),
    title: "Customers, Vehicles & Vendors",
    body: "Build a customer directory with phone numbers, email, address, and saved vehicles. Attach a customer to any quote and pull their vehicle info straight into the vehicle section. Track vendors separately — contact info, notes, and the parts they supply.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="8" />
        <path d="M24 6v4M24 38v4M6 24h4M38 24h4" />
        <path d="M11.5 11.5l2.8 2.8M33.7 33.7l2.8 2.8M11.5 36.5l2.8-2.8M33.7 14.3l2.8-2.8" />
        <circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    title: "Scheduled Maintenance",
    body: "Set a mileage interval on any job template — like 5,000 miles for an oil change — to flag it as a scheduled service. When a vehicle's mileage approaches or passes the interval, those services are surfaced so you don't miss a recommendation.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="10" width="36" height="28" rx="3" />
        <path d="M16 10V6M32 10V6" />
        <line x1="6" y1="18" x2="42" y2="18" />
        <path d="M24 26l-4 4 4 4M24 26l4 4-4 4" opacity="0.5"/>
        <path d="M20 30h8" />
        <circle cx="36" cy="34" r="5" fill="var(--accent)" stroke="none" opacity="0.25" />
        <circle cx="36" cy="34" r="2" fill="var(--accent)" stroke="none" />
      </svg>
    ),
    title: "Import, Export & Themes",
    body: "Move data in and out with CSV files — import your entire parts catalog, customer list, or job templates in seconds, IDs included so your template-to-parts links stay intact. Switch between dark and light mode and pick an accent color that fits your shop. Everything is saved automatically.",
  },
];

export const WELCOME_VERSION = "1.0";
export const WELCOME_KEY = "quote_calculator_welcome_seen";

function WelcomeModal({ onDismiss }: { onDismiss: () => void }) {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const isFirst = slide === 0;
  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="modal-overlay show welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-slide">
          <div className="welcome-slide-icon">{current.icon}</div>
          <h2 className="welcome-slide-title">{current.title}</h2>
          <p className="welcome-slide-body">{current.body}</p>
          {current.note && (
            <div className="welcome-note">
              <svg className="welcome-note-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="8" />
                <line x1="10" y1="9" x2="10" y2="14" />
                <circle cx="10" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
              </svg>
              <span>{current.note}</span>
            </div>
          )}
        </div>

        <div className="welcome-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`welcome-dot${i === slide ? " welcome-dot--active" : ""}`}
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="welcome-actions">
          {!isFirst && (
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={() => setSlide((s) => s - 1)}
            >
              ← Back
            </button>
          )}
          {isFirst && (
            <button
              type="button"
              className="btn-small btn-secondary"
              onClick={onDismiss}
            >
              Skip
            </button>
          )}
          <button
            type="button"
            className={`btn-small${isLast ? " btn-success" : ""}`}
            onClick={isLast ? onDismiss : () => setSlide((s) => s + 1)}
          >
            {isLast ? "Get Started" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeModal;
