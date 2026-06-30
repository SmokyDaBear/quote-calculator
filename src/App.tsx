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
import OrdersPage from "./components/OrdersPage";
import OrderEditor from "./components/OrderEditor";
import AppointmentsPage from "./components/AppointmentsPage";
import AppointmentModal from "./components/AppointmentModal";
import PurchaseOrdersPage from "./components/PurchaseOrdersPage";
import PurchaseOrderEditor from "./components/PurchaseOrderEditor";
import ExpensesPage from "./components/ExpensesPage";
import { EMPTY_CUSTOMER_FORM_DATA } from "./components/CustomerFormFields";
import { onPurchaseOrderRequest } from "./utils/poRequest";
import type { PoPrefill } from "./utils/poRequest";
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
  loadCustomTheme,
  saveCustomTheme,
  saveCustomer,
  updateCustomer,
  getCustomer,
  getCustomerVehicles,
  getQuote,
  getVendors,
} from "./storage";
import type { CustomTheme } from "./utils/customTheme";
import type {
  GlobalRates,
  BusinessInfo,
  QuoteIndexEntry,
  WorkingPart,
  WorkingJob,
  Customer,
  WarrantyPolicy,
  Appointment,
  Vendor,
} from "./types/index";
import { ToggleField } from "./components/forms/ToggleField";
import { ACCENT_PRESETS } from "./utils/accentPresets";
import { About } from "./components/About";
import WelcomeModal, {
  WELCOME_KEY,
  WELCOME_VERSION,
} from "./components/WelcomeModal";
import { useQuote, migrateJobParts, EMPTY_DISCOUNT } from "./hooks/useQuote";
import type { OrderDraft } from "./hooks/useOrder";

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
  { id: "orders", label: "Orders", icon: <IconQuote /> },
  { id: "appointments", label: "Appointments", icon: <IconCustomers /> },
  { id: "purchasing", label: "Purchasing", icon: <IconVendors /> },
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
  const [customTheme, setCustomTheme] = useState<CustomTheme | null>(
    () => loadCustomTheme(),
  );
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem(WELCOME_KEY) !== WELCOME_VERSION,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [quoteTab, setQuoteTab] = useState<"compose" | "history">("compose");
  const [historyPage, setHistoryPage] = useState(1);

  // ── Orders / appointments ──────────────────────────────────────────────────
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const [orderEditorState, setOrderEditorState] = useState<{
    orderId: string | null;
    draft: OrderDraft | null;
  } | null>(null);
  const [apptModal, setApptModal] = useState<{ draft: OrderDraft | null } | null>(null);
  const bumpOrders = () => setOrdersReloadKey((k) => k + 1);

  // ── Purchasing ──────────────────────────────────────────────────────────────
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [poEditorState, setPoEditorState] = useState<{
    poId: string | null;
    prefill: PoPrefill | null;
  } | null>(null);
  const [showExpenses, setShowExpenses] = useState(false);

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
    sublets,
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
    handleAddSublet,
    handleUpdateSublet,
    handleRemoveSublet,
    handleCreatePoForSublet,
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

  // Keep the vendor list fresh for sublets / purchase orders.
  useEffect(() => {
    getVendors().then(setVendors);
  }, [ordersReloadKey]);

  // Let any "Create Purchase Order" button (parts, sublets) open the PO editor.
  useEffect(() => {
    onPurchaseOrderRequest((prefill) => {
      setShowExpenses(false);
      setOrderEditorState(null);
      setPoEditorState({ poId: null, prefill });
      setActiveView("purchasing");
    });
    return () => onPurchaseOrderRequest(null);
  }, []);

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
    const resolved =
      accent === "custom" && customTheme
        ? customTheme
        : (ACCENT_PRESETS.find((p) => p.id === accent) ?? ACCENT_PRESETS[0]);
    const colors = isDark ? resolved.dark : resolved.light;
    const el = document.documentElement;
    el.style.setProperty("--accent", colors.accent);
    el.style.setProperty("--accent-hover", colors.accentHover);
    el.style.setProperty("--accent-ring", colors.accentRing);
    el.style.setProperty("--accent-text", colors.accentText);
    el.style.setProperty("--success", colors.accent);
    el.style.setProperty("--success-hover", colors.accentHover);
    localStorage.setItem(ACCENT_KEY, accent);
    saveAccent(accent);
  }, [accent, isDark, customTheme]);

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

  // ── Quote → order / appointment ─────────────────────────────────────────────
  const buildQuoteDraft = (): OrderDraft => ({
    customerData,
    customerId,
    selectedCustomer,
    vehicle,
    vehicleId: null,
    jobs,
    discount,
    ssOverride,
    isTaxable,
    notes,
    quoteId: currentQuoteId ?? undefined,
  });

  const handleConvertToOrder = () => {
    if (!customerData.name.trim()) {
      toast("Add customer info before creating an order.", "error");
      return;
    }
    setOrderEditorState({ orderId: null, draft: buildQuoteDraft() });
    setActiveView("orders");
  };

  const handleCreateAppointment = () => {
    setApptModal({ draft: buildQuoteDraft() });
  };

  const handleSaveQuoteCustomer = async () => {
    if (!customerData.name.trim()) return;
    const payload = {
      name: customerData.name,
      phones: customerData.phones,
      email: customerData.email,
      address: customerData.address,
      notes: customerData.notes,
      taxable: customerData.taxable,
      taxId: customerData.taxId,
    };
    if (customerId) {
      await updateCustomer(customerId, payload);
      toast("Customer updated.");
    } else {
      const c = await saveCustomer(payload);
      setCustomerId(c.id);
      setSelectedCustomer(c);
      toast("Customer saved.");
    }
  };

  const jobsFromQuoteDoc = (q: Record<string, unknown>): WorkingJob[] => {
    const arr = (q.jobs as Array<Record<string, unknown>>) ?? [];
    return arr.map((jobData, i) => ({
      id: i + 1,
      name: (jobData.name as string) || `Job ${i + 1}`,
      parts: migrateJobParts(jobData.parts),
      laborHrs: (jobData.laborHrs as number | string)?.toString() || "",
      laborCost: (jobData.laborCost as number | string)?.toString() || "",
      description: (jobData.description as string) || "",
      priceAtList: (jobData.priceAtList as boolean) || false,
      warrantyPolicyId: jobData.warrantyPolicyId as string | undefined,
      warrantyPolicyName: jobData.warrantyPolicyName as string | undefined,
      warrantyDateBilled: jobData.warrantyDateBilled as string | undefined,
      warrantyMileage: jobData.warrantyMileage as string | undefined,
    }));
  };

  const handleConvertAppointmentToOrder = async (appt: Appointment) => {
    const [cust, vehs] = await Promise.all([
      getCustomer(appt.customerId),
      getCustomerVehicles(appt.customerId),
    ]);
    const veh = vehs.find((v) => v.id === appt.vehicleId);

    let draftJobs: WorkingJob[] = [];
    let dDiscount = EMPTY_DISCOUNT;
    let dSs = { enabled: false, value: "" };
    let dTaxable = true;
    let dNotes = "";
    if (appt.quoteId) {
      const q = await getQuote(appt.quoteId);
      if (q) {
        draftJobs = jobsFromQuoteDoc(q);
        dDiscount = (q.discount as typeof EMPTY_DISCOUNT) || EMPTY_DISCOUNT;
        dSs = (q.ssOverride as typeof dSs) || dSs;
        dTaxable = (q.isTaxable as boolean) !== false;
        dNotes = (q.notes as string) || "";
      }
    }

    const draft: OrderDraft = {
      customerData: cust
        ? {
            name: cust.name,
            phones: cust.phones.length ? cust.phones : [{ label: "Mobile", number: "" }],
            email: cust.email,
            address: cust.address,
            notes: cust.notes,
            taxable: cust.taxable !== false,
            taxId: cust.taxId ?? "",
          }
        : EMPTY_CUSTOMER_FORM_DATA,
      customerId: appt.customerId,
      selectedCustomer: cust,
      vehicle: veh
        ? {
            year: veh.year, make: veh.make, model: veh.model,
            trim: veh.trim, vin: veh.vin, mileage: veh.mileage,
          }
        : { year: "", make: "", model: "", trim: "", vin: "", mileage: "" },
      vehicleId: appt.vehicleId,
      jobs: draftJobs,
      discount: dDiscount,
      ssOverride: dSs,
      isTaxable: dTaxable,
      notes: dNotes,
      quoteId: appt.quoteId,
    };
    setOrderEditorState({ orderId: null, draft });
    setActiveView("orders");
  };

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
                  setOrderEditorState(null);
                  setPoEditorState(null);
                  setShowExpenses(false);
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
                        onSaveCustomer={handleSaveQuoteCustomer}
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
                      sublets={sublets}
                      vendors={vendors}
                      subletMarkupMatrix={rates.subletMarkupMatrix}
                      onAddSublet={handleAddSublet}
                      onUpdateSublet={handleUpdateSublet}
                      onRemoveSublet={handleRemoveSublet}
                      onCreatePoForSublet={handleCreatePoForSublet}
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
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleConvertToOrder}
                      >
                        Create Work Order
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCreateAppointment}
                      >
                        Create Appointment
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
          {activeView === "orders" &&
            (orderEditorState ? (
              <OrderEditor
                orderId={orderEditorState.orderId}
                initialDraft={orderEditorState.draft}
                rates={rates}
                warrantyPolicies={warrantyPolicies}
                businessInfo={businessInfo}
                vendors={vendors}
                toast={toast}
                onBack={() => {
                  setOrderEditorState(null);
                  bumpOrders();
                }}
                onChanged={bumpOrders}
              />
            ) : (
              <OrdersPage
                reloadKey={ordersReloadKey}
                onNewOrder={() => setOrderEditorState({ orderId: null, draft: null })}
                onOpenOrder={(id) => setOrderEditorState({ orderId: id, draft: null })}
              />
            ))}
          {activeView === "appointments" && (
            <AppointmentsPage
              reloadKey={ordersReloadKey}
              onNewAppointment={() => setApptModal({ draft: null })}
              onConvertToOrder={handleConvertAppointmentToOrder}
              onChanged={bumpOrders}
            />
          )}
          {activeView === "purchasing" &&
            (poEditorState ? (
              <PurchaseOrderEditor
                poId={poEditorState.poId}
                prefill={poEditorState.prefill}
                onBack={() => {
                  setPoEditorState(null);
                  bumpOrders();
                }}
                onChanged={bumpOrders}
                toast={toast}
              />
            ) : showExpenses ? (
              <ExpensesPage reloadKey={ordersReloadKey} onBack={() => setShowExpenses(false)} />
            ) : (
              <PurchaseOrdersPage
                reloadKey={ordersReloadKey}
                onNewPo={() => setPoEditorState({ poId: null, prefill: null })}
                onOpenPo={(id) => setPoEditorState({ poId: id, prefill: null })}
                onViewExpenses={() => setShowExpenses(true)}
              />
            ))}
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
              customTheme={customTheme}
              onCustomThemeSave={(theme) => {
                saveCustomTheme(theme);
                setCustomTheme(theme);
                setAccent("custom");
              }}
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
      {apptModal && (
        <AppointmentModal
          draft={apptModal.draft}
          onClose={() => setApptModal(null)}
          onSaved={() => {
            setApptModal(null);
            bumpOrders();
            setActiveView("appointments");
          }}
          toast={toast}
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
