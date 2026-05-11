import { useState, useEffect, useMemo } from "react";
import Modal from "./components/Modal";
import HistorySidebar from "./components/HistorySidebar";
import QuoteInfo from "./components/QuoteInfo";
import JobsSection from "./components/JobsSection";
import NotesSection from "./components/NotesSection";
import ResultsSection from "./components/ResultsSection";
import DiscountSection from "./components/DiscountSection";
import TasksPanel from "./components/TasksPanel";
import Footer from "./components/Footer";
import TemplatesPage from "./components/TemplatesPage";
import InventoryPage from "./components/InventoryPage";
import SettingsPage from "./components/SettingsPage";
import CustomersPage from "./components/CustomersPage";
import VendorsPage from "./components/VendorsPage";
import VehicleSection from "./components/VehicleSection";
import ServiceRecommendations from "./components/ServiceRecommendations";
import QuickJobs from "./components/QuickJobs";
import TemplateFillModal from "./components/TemplateFillModal";
import { printQuote } from "./utils/printQuote";
import { useToast, ToastContainer } from "./components/Toast";
import {
  IconQuote,
  IconTemplates,
  IconInventory,
  IconSettings,
  IconCustomers,
  IconVendors,
  PrintIcon,
  SaveIcon,
} from "./icons";
import {
  DEFAULT_RATES,
  loadGlobalRates,
  saveGlobalRates,
  getCurrentQuoteNumber,
  saveQuote,
  updateQuote,
  getHistoryIndex,
  clearHistory,
  clearAllData,
  getQuote,
  deleteQuote,
  searchQuotes,
  saveJobTemplate,
  loadBusinessInfo,
  saveBusinessInfo,
  saveAccent,
  getPartsLibrary,
} from "./storage";
import type { GlobalRates, BusinessInfo, QuoteIndexEntry, JobTemplate, WorkingJob, WorkingPart, TemplatePart_Specific } from "./types/index";
import { ACCENT_PRESETS } from "./utils/accentPresets";
import { About } from "./components/About";
import WelcomeModal, { WELCOME_KEY, WELCOME_VERSION } from "./components/WelcomeModal";

const THEME_KEY = "quote_calculator_theme";
const ACCENT_KEY = "quote_calculator_accent";

const BIZ_DEFAULTS: BusinessInfo = { name: "", address: "", phone: "", logo: "", printMessage: "" };

const EMPTY_JOB = (id: number) => ({
  id,
  name: `Job ${id}`,
  parts: [] as WorkingPart[],
  laborHrs: "",
  laborCost: "",
  description: "",
  priceAtList: false,
});

const migrateJobParts = (parts: unknown): WorkingPart[] => {
  if (Array.isArray(parts)) {
    return (parts as Array<Record<string, unknown>>).map((p) => ({
      partNumber: (p.partNumber as string) ?? "",
      name: (p.name as string) ?? "",
      price: (p.price as string) ?? "",
      quantity: Number(p.quantity) || 1,
      cost: p.cost as string | undefined,
      msrp: p.msrp as string | undefined,
    }));
  }
  const num = Number(parts) || 0;
  return num > 0 ? [{ partNumber: "", name: "Parts", price: String(num), quantity: 1 }] : [];
};

const NAV_TABS = [
  { id: "quote",     label: "Quotes",        icon: <IconQuote /> },
  { id: "templates", label: "Job Templates",  icon: <IconTemplates /> },
  { id: "inventory", label: "Inventory",      icon: <IconInventory /> },
  { id: "customers", label: "Customers",      icon: <IconCustomers /> },
  { id: "vendors",   label: "Vendors",        icon: <IconVendors /> },
  { id: "settings",  label: "Settings",       icon: <IconSettings /> },
];

const EMPTY_VEHICLE = { year: "", make: "", model: "", trim: "", vin: "", mileage: "" };
type DiscountState = { type: "percentage" | "flat"; value: string; appliesTo: "both" | "parts" | "labor" };
const EMPTY_DISCOUNT: DiscountState = { type: "percentage", value: "", appliesTo: "both" };

function App({ legacyMigrated = false }: { legacyMigrated?: boolean }) {
  const [dbReady, setDbReady] = useState(false);
  const [activeView, setActiveView] = useState("quote");
  const [jobs, setJobs] = useState([EMPTY_JOB(1)]);
  const [jobCounter, setJobCounter] = useState(1);
  const [rates, setRates] = useState<GlobalRates>(DEFAULT_RATES);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(BIZ_DEFAULTS);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [vehicle, setVehicle] = useState(EMPTY_VEHICLE);
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState(1001);
  const [history, setHistory] = useState<QuoteIndexEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [accent, setAccent] = useState(() => localStorage.getItem(ACCENT_KEY) ?? "green");
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem(WELCOME_KEY) !== WELCOME_VERSION,
  );
  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_KEY, WELCOME_VERSION);
    setShowWelcome(false);
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [fillModal, setFillModal] = useState<{ template: JobTemplate } | null>(null);
  const [mobilePanel, setMobilePanel] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [discount, setDiscount] = useState(EMPTY_DISCOUNT);

  const { toasts, toast, dismiss } = useToast();

  // ── Initial load from IndexedDB ────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      loadGlobalRates(),
      loadBusinessInfo(),
      getCurrentQuoteNumber(),
      getHistoryIndex(),
    ]).then(([r, biz, qNum, hist]) => {
      setRates(r);
      setBusinessInfo(biz);
      setQuoteNumber(qNum);
      setHistory(hist);
      setDbReady(true);
      if (legacyMigrated) {
        toast(
          'Your data has been migrated to IndexedDB for better performance. Your original data is preserved in localStorage as a backup.',
        );
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const preset = ACCENT_PRESETS.find((p) => p.id === accent) ?? ACCENT_PRESETS[0];
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

  const totals = useMemo(() => {
    let grandLaborCost = 0;
    let grandLaborHours = 0;
    let grandPartsTotal = 0;
    let grandSsTotal = 0;

    const jobSummaries = jobs.map((job) => {
      const partsTotal = job.parts.reduce(
        (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
        0,
      );
      const laborHrs = Number(job.laborHrs) || 0;
      const laborCost = Number(job.laborCost) || 0;
      const subtotal = laborCost + partsTotal;

      grandLaborCost += laborCost;
      grandLaborHours += laborHrs;
      grandPartsTotal += partsTotal;
      grandSsTotal += rates.ssRate * 0.01 * laborCost;

      return { id: job.id, name: job.name || `Job ${job.id}`, laborCost, laborHrs, partsTotal, subtotal };
    });

    grandSsTotal = Math.min(grandSsTotal, rates.ssMax);

    const taxableAmount = grandPartsTotal + grandSsTotal;
    const taxTotal = taxableAmount * (rates.taxRate * 0.01);

    const discountValue = Number(discount.value) || 0;
    let discountAmount = 0;
    if (discountValue > 0) {
      const base =
        discount.appliesTo === "parts" ? grandPartsTotal
        : discount.appliesTo === "labor" ? grandLaborCost
        : grandLaborCost + grandPartsTotal;
      discountAmount =
        discount.type === "percentage" ? base * (discountValue / 100) : Math.min(discountValue, base);
    }

    const grandTotal = grandLaborCost + grandPartsTotal + grandSsTotal + taxTotal - discountAmount;

    return { jobSummaries, laborCost: grandLaborCost, laborHours: grandLaborHours, partsTotal: grandPartsTotal, ssTotal: grandSsTotal, taxTotal, discountAmount, discount, grandTotal };
  }, [jobs, rates, discount]);

  const refreshHistory = async () => {
    const h = await getHistoryIndex();
    setHistory(h);
  };

  const handleRatesChange = (newRates: GlobalRates) => {
    setRates(newRates);
    saveGlobalRates(newRates);
  };

  const handleBusinessChange = (info: BusinessInfo) => {
    setBusinessInfo(info);
    saveBusinessInfo(info);
  };

  const handleAddJob = () => {
    const newId = jobCounter + 1;
    setJobCounter(newId);
    setJobs((prev) => [...prev, EMPTY_JOB(newId)]);
  };

  const handleUpdateJob = (id: number, field: string, value: unknown) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const updated = { ...j, [field]: value };
        if (field === "laborHrs") {
          const computed = (Number(value) || 0) * rates.laborRate;
          updated.laborCost = computed > 0 ? computed.toFixed(2) : "";
        }
        if (field === "priceAtList") {
          const on = value as boolean;
          updated.parts = j.parts.map((p) => {
            if (on) {
              return {
                ...p,
                basePrice: p.price,
                price: (p.msrp && Number(p.msrp) > 0) ? p.msrp : p.price,
              };
            } else {
              return {
                ...p,
                price: p.basePrice ?? p.price,
                basePrice: undefined,
              };
            }
          });
        }
        return updated;
      }),
    );
  };

  const handleRemoveJob = (id: number) =>
    setJobs((prev) => prev.filter((j) => j.id !== id));

  const handleNewQuote = async () => {
    setCurrentQuoteId(null);
    setQuoteNumber(await getCurrentQuoteNumber());
    setCustomerName("");
    setPhone("");
    setCustomerId(null);
    setNotes("");
    setVehicle(EMPTY_VEHICLE);
    setRates(await loadGlobalRates());
    setJobCounter(1);
    setJobs([EMPTY_JOB(1)]);
    setDiscount(EMPTY_DISCOUNT);
  };

  const buildQuoteData = () => ({
    customerName: customerName.trim(),
    phone,
    customerId,
    notes,
    vehicle,
    rates,
    discount,
    jobs: jobs.map((j) => ({
      name: j.name,
      parts: j.parts.map((p) => ({
        partNumber: p.partNumber || "",
        name: p.name,
        price: Number(p.price) || 0,
        quantity: Number(p.quantity) || 1,
        cost: p.cost,
        msrp: p.msrp,
      })),
      laborHrs: Number(j.laborHrs) || 0,
      laborCost: Number(j.laborCost) || 0,
      description: j.description,
      priceAtList: j.priceAtList,
    })),
    grandTotal: totals.grandTotal,
  });

  const handleSaveQuote = async () => {
    if (!customerName.trim()) {
      toast("Please enter a customer name before saving.", "error");
      return;
    }
    const savedNumber = await saveQuote(buildQuoteData());
    setCurrentQuoteId(String(savedNumber));
    setQuoteNumber(savedNumber);
    await refreshHistory();
    toast(`Quote #${savedNumber} saved successfully!`);
  };

  const handleUpdateQuote = async () => {
    if (!currentQuoteId) return;
    if (!customerName.trim()) {
      toast("Please enter a customer name before saving.", "error");
      return;
    }
    await updateQuote(currentQuoteId, buildQuoteData());
    await refreshHistory();
    toast(`Quote #${currentQuoteId} updated successfully!`);
  };

  const handleLoadQuote = async (quoteId: string) => {
    const quote = await getQuote(quoteId);
    if (!quote) {
      toast("Quote not found.", "error");
      return;
    }
    setCurrentQuoteId(quoteId);
    setQuoteNumber(Number(quoteId));
    setCustomerName((quote.customerName as string) || "");
    setPhone((quote.phone as string) || "");
    setCustomerId((quote.customerId as string) || null);
    setNotes((quote.notes as string) || "");
    setVehicle((quote.vehicle as typeof EMPTY_VEHICLE) || EMPTY_VEHICLE);
    if (quote.rates) setRates(quote.rates as GlobalRates);
    setDiscount((quote.discount as typeof EMPTY_DISCOUNT) || EMPTY_DISCOUNT);
    if (quote.jobs && (quote.jobs as unknown[]).length > 0) {
      const loaded = (quote.jobs as Array<Record<string, unknown>>).map((jobData, i) => ({
        id: i + 1,
        name: (jobData.name as string) || `Job ${i + 1}`,
        parts: migrateJobParts(jobData.parts),
        laborHrs: (jobData.laborHrs as string)?.toString() || "",
        laborCost: (jobData.laborCost as string)?.toString() || "",
        description: (jobData.description as string) || "",
        priceAtList: (jobData.priceAtList as boolean) || false,
      }));
      setJobs(loaded);
      setJobCounter(loaded.length);
    } else {
      setJobs([EMPTY_JOB(1)]);
      setJobCounter(1);
    }
  };

  const handleDeleteHistoryQuote = async (quoteId: string) => {
    if (!window.confirm(`Delete Quote #${quoteId}? This cannot be undone.`)) return;
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

  const handlePrint = () => {
    printQuote({ quoteNumber, customerName, phone, notes, vehicle, jobs, rates, totals, discount, businessInfo });
  };

  const handleSaveAsTemplate = async (job: WorkingJob) => {
    await saveJobTemplate({
      name: job.name,
      description: job.description || "",
      laborHrs: Number(job.laborHrs) || 0,
      laborCost: Number(job.laborCost) || 0,
      parts: [],  // quote parts can't be reverse-linked to partIds; user adds in template editor
    });
    toast(`Template "${job.name}" saved.`);
  };

  const applyTemplateWithParts = (template: JobTemplate, resolvedParts: WorkingPart[]) => {
    const newId = jobCounter + 1;
    setJobCounter(newId);
    setJobs((prev) => [
      ...prev,
      {
        id: newId,
        name: template.name,
        parts: resolvedParts.map((p) => ({
          partNumber: p.partNumber || "",
          name: p.name || "",
          price: p.price?.toString() || "",
          quantity: p.quantity ?? 1,
          cost: p.cost,
          msrp: p.msrp,
        })),
        laborHrs: template.laborHrs ? template.laborHrs.toString() : "",
        laborCost: template.laborCost ? template.laborCost.toString() : "",
        description: template.description || "",
        priceAtList: false,
      },
    ]);
  };

  const handleApplyTemplate = async (template: JobTemplate) => {
    const hasSlots = (template.parts || []).some((p) => p.type === "category");

    if (hasSlots) {
      setFillModal({ template });
      setActiveView("quote");
      return;
    }

    // Resolve specific parts from library
    const library = await getPartsLibrary();
    const resolved: WorkingPart[] = (template.parts || [])
      .filter((p): p is TemplatePart_Specific => p.type === "specific" && !!p.partId)
      .map((p) => {
        const found = library.find((lp) => lp.id === p.partId);
        return {
          partNumber: found?.partNumber || "",
          name: found?.name || "(unknown part)",
          price: found?.price?.toString() || "0",
          quantity: p.quantity,
          cost: found?.cost?.toString(),
          msrp: found?.msrp?.toString(),
        };
      });

    applyTemplateWithParts(template, resolved);
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
          {businessInfo.name || businessInfo.logo ? (
            <div className="header-brand">
              {businessInfo.logo && (
                <img src={businessInfo.logo} alt="Logo" className="header-logo" />
              )}
              {businessInfo.name && (
                <span className="header-biz-name">{businessInfo.name}</span>
              )}
            </div>
          ) : (
            <h1>Quote Calculator</h1>
          )}
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
                onClick={() => { setActiveView(tab.id); setNavOpen(false); }}
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
          className={`mobile-sidebar-btn${mobilePanel === "history" ? " active" : ""}`}
          onClick={() => toggleMobilePanel("history")}
        >
          History
        </button>
        <button
          className={`mobile-sidebar-btn${mobilePanel === "tasks" ? " active" : ""}`}
          onClick={() => toggleMobilePanel("tasks")}
        >
          Tasks
        </button>
      </div>

      <div className="app-body">
        <aside className={`app-sidebar-left${mobilePanel === "history" ? " mobile-open" : ""}`}>
          <HistorySidebar
            history={history}
            searchTerm={searchTerm}
            onSearch={handleSearch}
            onLoadQuote={handleLoadQuote}
            onDeleteQuote={handleDeleteHistoryQuote}
          />
        </aside>

        <main>
          {activeView === "quote" && (
            <div className="calculator-container">
              <QuoteInfo
                quoteNumber={quoteNumber}
                customerName={customerName}
                setCustomerName={setCustomerName}
                phone={phone}
                setPhone={setPhone}
                onNewQuote={handleNewQuote}
                onCustomerSelect={(c: { id: string } | null) => setCustomerId(c ? c.id : null)}
              />
              <VehicleSection vehicle={vehicle} onChange={setVehicle} customerId={customerId} />
              <NotesSection notes={notes} onChange={setNotes} />
              <QuickJobs jobs={jobs} onApplyTemplate={handleApplyTemplate} />
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
              <DiscountSection discount={discount} onChange={setDiscount} />
              <div className="action-buttons quote-actions">
                <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                  <PrintIcon /> Print Quote
                </button>
                {currentQuoteId && (
                  <button type="button" className="btn btn-success" onClick={handleSaveQuote}>
                    <SaveIcon /> Save as New
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${currentQuoteId ? "btn-warning" : "btn-success"}`}
                  onClick={currentQuoteId ? handleUpdateQuote : handleSaveQuote}
                >
                  <SaveIcon />
                  {currentQuoteId ? `Update #${currentQuoteId}` : "Save Quote"}
                </button>
              </div>
              <ResultsSection totals={totals} />
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
            <InventoryPage onToast={toast} markupMatrix={rates.partsMarkupMatrix} />
          )}
          {activeView === "customers" && <CustomersPage onToast={toast} />}
          {activeView === "vendors" && <VendorsPage onToast={toast} />}
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

        <aside className={`app-sidebar-right${mobilePanel === "tasks" ? " mobile-open" : ""}`}>
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {showWelcome && <WelcomeModal onDismiss={dismissWelcome} />}
    </div>
  );
}

export default App;
