import {
  IconQuote,
  IconTemplates,
  IconInventory,
  IconSettings,
  IconCustomers,
} from "../icons";
import { LogoImg, VerdantLeaf } from "./verdant/LogoImg";

const NAV_TABS = [
  { id: "quote", label: "Quote Calculator", icon: <IconQuote /> },
  { id: "templates", label: "Job Templates", icon: <IconTemplates /> },
  { id: "inventory", label: "Inventory", icon: <IconInventory /> },
  { id: "customers", label: "Customers", icon: <IconCustomers /> },
  { id: "settings", label: "Settings", icon: <IconSettings /> },
];

function Footer({ activeView, onSetView, isDark, onToggleTheme }) {
  return (
    <footer className="app-footer">
      <nav className="footer-nav">
        <span className="footer-nav-heading">Navigation</span>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`footer-nav-link${activeView === tab.id ? " active" : ""}`}
            onClick={() => onSetView(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="footer-nav">
        <span className="footer-nav-heading">Settings</span>

        <button
          className="footer-theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
        >
          <svg
            className="footer-toggle-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <div className={`footer-toggle-track${isDark ? " active" : ""}`}>
            <div className="footer-toggle-thumb" />
          </div>
          {/* Moon */}
          <svg
            className="footer-toggle-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span className="footer-toggle-label">
            {isDark ? "Dark" : "Light"} Theme
          </span>
        </button>
      </div>
      <div className="footer-copyright">
        <div className="footer-logo m-auto">
          <LogoImg borderRadius={15} borderThickness={3} preferredSize={64} />
          <div className="footer-logo-brand">
            <span className="footer-logo-built">Built with</span>
            <a
              href="https://verdant-webworks.vercel.app/"
              className="verdant-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <VerdantLeaf width={14} height={14} />
              Verdant
            </a>
          </div>
        </div>
        <span className="m-auto">
          {" "}
          © {new Date().getFullYear()} Verdant Webworks. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

export default Footer;
