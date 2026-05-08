import { IconQuote, IconTemplates, IconInventory, IconSettings } from '../icons';

const NAV_TABS = [
  { id: 'quote',     label: 'Quote Calculator', icon: <IconQuote /> },
  { id: 'templates', label: 'Job Templates',    icon: <IconTemplates /> },
  { id: 'inventory', label: 'Inventory',        icon: <IconInventory /> },
  { id: 'settings',  label: 'Settings',         icon: <IconSettings /> },
];

function Footer({ activeView, onSetView, isDark, onToggleTheme }) {
  return (
    <footer className="app-footer">
      <nav className="footer-nav">
        <span className="footer-nav-heading">Navigation</span>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`footer-nav-link${activeView === tab.id ? ' active' : ''}`}
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
          {isDark ? '☀ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </footer>
  );
}

export default Footer;
