import {
  IconQuote,
  IconTemplates,
  IconInventory,
  IconSettings,
  IconCustomers,
} from "../icons";
import { LogoImg, VerdantLeaf } from "./verdant/LogoImg";

const NAV_TABS = [
  { id: "quote",     label: "Quote Calculator", icon: <IconQuote /> },
  { id: "templates", label: "Job Templates",    icon: <IconTemplates /> },
  { id: "inventory", label: "Inventory",        icon: <IconInventory /> },
  { id: "customers", label: "Customers",        icon: <IconCustomers /> },
  { id: "settings",  label: "Settings",         icon: <IconSettings /> },
];

function Footer({ activeView, onSetView, isDark, onToggleTheme }) {
  return (
    <footer className="app-footer">
      <div className="footer-logo">
        <LogoImg borderRadius={15} borderThickness={3} preferredSize={75} />
        <span className="footer-logo-text">
          Built With
          <a
            href="https://verdant-webworks.vercel.app/"
            className="verdant-link"
          >
            Verdant
            <VerdantLeaf
              style={{ verticalAlign: "top" }}
              width={16}
              height={16}
            />
          </a>
        </span>
      </div>
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

      <div className="footer-right">
        <span className="footer-brand">Quote Calculator</span>
        <button className="footer-theme-btn" onClick={onToggleTheme}>
          {isDark ? "☀ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>
    </footer>
  );
}

export default Footer;
