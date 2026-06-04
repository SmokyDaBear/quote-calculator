import { useState, useEffect } from "react";
import Modal from "./components/Modal";
import QuoteInfo from "./components/QuoteInfo";
import QuoteHistoryPanel from "./components/QuoteHistoryPanel";
import JobsSection from "./components/JobsSection";
import NotesSection from "./components/NotesSection";
import ResultsSection from "./components/ResultsSection";
import ShopSuppliesOverride from "./components/ShopSuppliesOverride";
import DiscountSection from "./components/DiscountSection";
import TasksPanel from "./components/TasksPanel";
import Footer from "./components/Footer";
import TemplatesPage from "./components/TemplatesPage";
import InventoryPage from "./components/InventoryPage";
import SettingsPage from "./components/SettingsPage";
import CustomersPage from "./components/CustomersPage";
import VendorsPage from "./components/VendorsPage";
import VehiclesPage from "./components/VehiclesPage";
import ToolsPage from "./components/ToolsPage";
import VehicleSection from "./components/VehicleSection";
import ServiceRecommendations from "./components/ServiceRecommendations";
import QuickJobs from "./components/QuickJobs";
import TemplateFillModal from "./components/TemplateFillModal";
import { useToast, ToastContainer } from "./components/Toast";
import {
  IconQuote,
  IconTemplates,
  IconInventory,
  IconSettings,
  IconCustomers,
  IconVendors,
  IconVehicles,
  IconTools,
  PrintIcon,
  SaveIcon,
  NewQuoteIcon,
} from "./icons";
import {
  DEFAULT_RATES,
  loadGlobalRates,
  saveGlobalRates,
  getHistoryIndex,
  clearHistory,
  clearAllData,
  deleteQuote,
  searchQuotes,
  loadBusinessInfo,
  saveBusinessInfo,
  saveAccent,
  getWarrantyPolicies,
  getCurrentQuoteNumber,
} from "./storage";
import type {
  GlobalRates,
  BusinessInfo,
  QuoteIndexEntry,
  WorkingPart,
  Customer,
  WarrantyPolicy,
} from "./types/index";
import { ToggleField } from "./components/forms/ToggleField";
import { ACCENT_PRESETS } from "./utils/accentPresets";
import { About } from "./components/About";
import WelcomeModal, {
  WELCOME_KEY,
  WELCOME_VERSION,
} from "./components/WelcomeModal";
import { useQuote } from "./hooks/useQuote";

const THEME_KEY = "quote_calculator_theme";
const ACCENT_KEY = "quote_calculator_accent";

const BIZ_DEFAULTS: BusinessInfo = {
  name: "",
  address: "",
  phone: "",
  logo: "",
  printMessage: "",
};

const NAV_TABS = [
  { id: "quote", label: "Quotes", icon: <IconQuote /> },
  { id: "templates", label: "Job Templates", icon: <IconTemplates /> },
  { id: "inventory", label: "Inventory", icon: <IconInventory /> },
  { id: "customers", label: "Customers", icon: <IconCustomers /> },
  { id: "vehicles", label: "Vehicles", icon: <IconVehicles /> },
  { id: "vendors", label: "Vendors", icon: <IconVendors /> },
  { id: "tools", label: "Tools", icon: <IconTools /> },
  { id: "settings", label: "Settings", icon: <IconSettings /> },
];

function App({ legacyMigrated = false }: { legacyMigrated?: boolean }) {
  // ── App-level state ────────────────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false);
  const [activeView, setActiveView] = useState("quote");
  const [rates, setRates] = useState<GlobalRates>(DEFAULT_RATES);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(BIZ_DEFAULTS);
  const [history, setHistory] = useState<QuoteIndexEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [warrantyPolicies, setWarrantyPolicies] = useState<WarrantyPolicy[]>(
    [],
  );
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ?
        saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [accent, setAccent] = useState(
    () => localStorage.getItem(ACCENT_KEY) ?? "green",
  );
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem(WELCOME_KEY) !== WELCOME_VERSION,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [quoteTab, setQuoteTab] = useState<"compose" | "history">("compose");
  const [historyPage, setHistoryPage] = useState(1);

  const { toasts, toast, dismiss } = useToast();

  // ── Quote hook ─────────────────────────────────────────────────────────────
  const {
    jobs,
    customerData,
    setCustomerData,
    isTaxable,
    setIsTaxable,
    customerId,
    setCustomerId,
    selectedCustomer,
    setSelectedCustomer,
    notes,
    setNotes,
    vehicle,
    setVehicle,
    currentQuoteId,
    quoteNumber,
    setQuoteNumber,
    discount,
    setDiscount,
    ssOverride,
    setSsOverride,
    fillModal,
    setFillModal,
    totals,
    handleNewQuote,
    handleSaveQuote,
    handleUpdateQuote,
    handleLoadQuote,
    handlePrint,
    handleAddJob,
    handleUpdateJob,
    handleRemoveJob,
    handleSaveAsTemplate,
    applyTemplateWithParts,
    handleApplyTemplate,
  } = useQuote({
    rates,
    warrantyPolicies,
    businessInfo,
    toast,
    refreshHistory,
    onRatesChange: setRates,
    onNavigateToCompose: () => {
      setQuoteTab("compose");
      setHistoryPage(1);
    },
    onApplyTemplateWithSlots: () => setActiveView("quote"),
  });

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      loadGlobalRates(),
      loadBusinessInfo(),
      getHistoryIndex(),
      getWarrantyPolicies(),
    ]).then(([r, biz, hist, wPolicies]) => {
      setRates(r);
      setBusinessInfo(biz);
      setHistory(hist);
      setWarrantyPolicies(wPolicies);
      setDbReady(true);
      if (legacyMigrated) {
        toast(
          "Your data has been migrated to IndexedDB for better performance. Your original data is preserved in localStorage as a backup.",
        );
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The hook initializes quoteNumber to 1001; sync it with the real current number on mount.
  // We do this separately so the hook can already be in scope when useEffect runs.
  useEffect(() => {
    getCurrentQuoteNumber().then(setQuoteNumber);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const preset =
      ACCENT_PRESETS.find((p) => p.id === accent) ?? ACCENT_PRESETS[0];
    const colors = isDark ? preset.dark : preset.light;
    const el = document.documentElement;
    el.style.setProperty("--accent", colors.accent);
    el.style.setProperty("--accent-hover", colors.accentHover);
    el.style.setProperty("--accent-ring", colors.accentRing);
    el.style.setProperty("--success", colors.accent);
    el.style.setProperty("--success-hover", colors.accentHover);
    localStorage.setItem(ACCENT_KEY, accent);
    saveAccent(accent);
  }, [accent, isDark]);

  // ── App-level handlers ─────────────────────────────────────────────────────

  async function refreshHistory() {
    const h = await getHistoryIndex();
    setHistory(h);
  }

  const handleRatesChange = (newRates: GlobalRates) => {
    setRates(newRates);
    saveGlobalRates(newRates);
  };

  const handleBusinessChange = (info: BusinessInfo) => {
    setBusinessInfo(info);
    saveBusinessInfo(info);
  };

  const handleDeleteHistoryQuote = async (quoteId: string) => {
    if (!window.confirm(`Delete Quote #${quoteId}? This cannot be undone.`))
      return;
    await deleteQuote(quoteId);
    if (currentQuoteId === quoteId) await handleNewQuote();
    else await refreshHistory();
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim() === "") {
      await refreshHistory();
    } else {
      const results = await searchQuotes(term);
      setHistory(results);
    }
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setModalOpen(false);
    await handleNewQuote();
    setHistory([]);
  };

  const handleClearAllData = async () => {
    await clearAllData();
    window.location.reload();
  };

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_KEY, WELCOME_VERSION);
    setShowWelcome(false);
  };

  const toggleMobilePanel = (panel: string) =>
    setMobilePanel((prev) => (prev === panel ? null : panel));

  if (!dbReady) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <div className="app-root">
      <div className={`app-header-wrap${navOpen ? " nav-open" : ""}`}>
        <header>
          {businessInfo.name || businessInfo.logo ?
            <div className="header-brand">
              {businessInfo.logo && (
                <img
                  src={businessInfo.logo}
                  alt="Logo"
                  className="header-logo"
                />
              )}
              {businessInfo.name && (
                <span className="header-biz-name">{businessInfo.name}</span>
              )}
            </div>
          : <h1>Quote Calculator</h1>}
          <button
            className="nav-hamburger"
            aria-label="Toggle navigation"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </header>
        <nav className="main-nav">
          <div className="nav-drawer">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`main-nav-tab${activeView === tab.id ? " active" : ""}`}
                onClick={() => {
                  setActiveView(tab.id);
                  setNavOpen(false);
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <Modal
        isOpen={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={handleClearHistory}
      />

      <div className="mobile-sidebar-bar">
        <button
          className={`mobile-sidebar-btn${mobilePanel === "tasks" ? " active" : ""}`}
          onClick={() => toggleMobilePanel("tasks")}
        >
          Tasks
        </button>
      </div>

      <div className="app-body">
        <main>
          {activeView === "quote" && (
            <div className="calculator-container">
              <div className="section-tabs">
                <button
                  type="button"
                  className={`section-tab${quoteTab === "compose" ? " section-tab--active" : ""}`}
                  onClick={() => setQuoteTab("compose")}
                >
                  {currentQuoteId ? `Quote #${quoteNumber}` : "New Quote"}
                </button>
                <button
                  type="button"
                  className={`section-tab${quoteTab === "history" ? " section-tab--active" : ""}`}
                  onClick={() => {
                    setQuoteTab("history");
                    setHistoryPage(1);
                  }}
                >
                  History
                </button>
              </div>

              {quoteTab === "history" ?
                <QuoteHistoryPanel
                  history={history}
                  searchTerm={searchTerm}
                  onSearch={handleSearch}
                  onLoadQuote={handleLoadQuote}
                  onDeleteQuote={handleDeleteHistoryQuote}
                  page={historyPage}
                  onPageChange={setHistoryPage}
                />
              : <div className="quote-compose-layout">
                  {/* ── Main column ── */}
                  <div className="quote-compose-main">
                    <div className="quote-info-vehicle-row">
                      <QuoteInfo
                        customerData={customerData}
                        onCustomerDataChange={(d) => {
                          setCustomerData(d);
                          setIsTaxable(d.taxable);
                        }}
                        onCustomerSelect={(c: Customer | null) => {
                          setCustomerId(c ? c.id : null);
                          setSelectedCustomer(c);
                        }}
                        selectedCustomer={selectedCustomer}
                      />
                      <VehicleSection
                        vehicle={vehicle}
                        onChange={setVehicle}
                        customerId={customerId}
                      />
                    </div>
                    <QuickJobs
                      jobs={jobs}
                      onApplyTemplate={handleApplyTemplate}
                    />
                    <ServiceRecommendations
                      mileage={vehicle.mileage}
                      jobs={jobs}
                      onApplyTemplate={handleApplyTemplate}
                    />
                    <JobsSection
                      jobs={jobs}
                      totals={totals}
                      onAddJob={handleAddJob}
                      onUpdateJob={handleUpdateJob}
                      onRemoveJob={handleRemoveJob}
                      onSaveAsTemplate={handleSaveAsTemplate}
                      onApplyTemplate={handleApplyTemplate}
                    />
                    <div className="quote-modifiers">
                      <DiscountSection
                        discount={discount}
                        onChange={setDiscount}
                      />
                      <ShopSuppliesOverride
                        override={ssOverride}
                        onChange={setSsOverride}
                        autoAmount={totals.autoSsTotal}
                      />
                      <div className="quote-taxable-section">
                        <ToggleField
                          checked={isTaxable}
                          onChange={setIsTaxable}
                          label="Taxable"
                          badge={
                            !isTaxable && customerData.taxId ?
                              `Exempt ID: ${customerData.taxId}`
                            : undefined
                          }
                        />
                      </div>
                    </div>
                    <NotesSection
                      notes={notes}
                      onChange={setNotes}
                    />
                  </div>

                  {/* ── Sticky aside ── */}
                  <div className="quote-compose-aside">
                    <div className="quote-aside-number">
                      <span className="quote-aside-label">Quote #</span>
                      <span className="quote-aside-num">{quoteNumber}</span>
                    </div>
                    <div className="quote-aside-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleNewQuote}
                      >
                        <NewQuoteIcon /> New Quote
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handlePrint}
                      >
                        <PrintIcon /> Print Quote
                      </button>
                      {currentQuoteId && (
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={handleSaveQuote}
                        >
                          <SaveIcon /> Save as New
                        </button>
                      )}
                      <button
                        type="button"
                        className={`btn ${currentQuoteId ? "btn-warning" : "btn-success"}`}
                        onClick={
                          currentQuoteId ? handleUpdateQuote : handleSaveQuote
                        }
                      >
                        <SaveIcon />
                        {currentQuoteId ?
                          `Update #${currentQuoteId}`
                        : "Save Quote"}
                      </button>
                    </div>
                    <ResultsSection totals={totals} />
                  </div>
                </div>
              }
            </div>
          )}
          {activeView === "templates" && (
            <TemplatesPage
              onApplyTemplate={handleApplyTemplate}
              onSwitchToQuote={() => setActiveView("quote")}
              onToast={toast}
            />
          )}
          {activeView === "inventory" && (
            <InventoryPage
              onToast={toast}
              markupMatrix={rates.partsMarkupMatrix}
            />
          )}
          {activeView === "customers" && <CustomersPage onToast={toast} />}
          {activeView === "vehicles" && <VehiclesPage onToast={toast} />}
          {activeView === "vendors" && <VendorsPage onToast={toast} />}
          {activeView === "tools" && <ToolsPage />}
          {activeView === "about" && <About />}
          {activeView === "settings" && (
            <SettingsPage
              rates={rates}
              onRatesChange={handleRatesChange}
              businessInfo={businessInfo}
              onBusinessChange={handleBusinessChange}
              isDark={isDark}
              onToggleTheme={() => setIsDark((d) => !d)}
              accent={accent}
              onAccentChange={setAccent}
              onClearHistory={() => setModalOpen(true)}
              onClearAllData={handleClearAllData}
              onToast={toast}
            />
          )}
        </main>

        <aside
          className={`app-sidebar-right${mobilePanel === "tasks" ? " mobile-open" : ""}`}
        >
          <TasksPanel />
        </aside>
      </div>

      <Footer
        activeView={activeView}
        onSetView={setActiveView}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      {fillModal && (
        <TemplateFillModal
          template={fillModal.template}
          onConfirm={(resolvedParts: WorkingPart[]) => {
            applyTemplateWithParts(fillModal.template, resolvedParts);
            setFillModal(null);
          }}
          onCancel={() => setFillModal(null)}
        />
      )}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismiss}
      />
      {showWelcome && <WelcomeModal onDismiss={dismissWelcome} />}
    </div>
  );
}

export default App;
