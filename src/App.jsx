import { useState, useEffect, useMemo, useRef } from 'react';
import Header from './components/Header';
import Modal from './components/Modal';
import HistorySidebar from './components/HistorySidebar';
import QuoteInfo from './components/QuoteInfo';
import JobsSection from './components/JobsSection';
import NotesSection from './components/NotesSection';
import ResultsSection from './components/ResultsSection';
import TasksPanel from './components/TasksPanel';
import Footer from './components/Footer';
import PartPickerModal from './components/PartPickerModal';
import TemplatesPage from './components/TemplatesPage';
import InventoryPage from './components/InventoryPage';
import SettingsPage from './components/SettingsPage';
import VehicleSection from './components/VehicleSection';
import { printQuote } from './utils/printQuote';
import { useToast, ToastContainer } from './components/Toast';
import { IconQuote, IconTemplates, IconInventory, IconSettings } from './icons';
import {
  loadGlobalRates,
  saveGlobalRates,
  getCurrentQuoteNumber,
  saveQuote,
  updateQuote,
  getHistoryIndex,
  clearHistory,
  getQuote,
  deleteQuote,
  searchQuotes,
  saveJobTemplate,
  loadBusinessInfo,
  saveBusinessInfo,
} from './storage';

const THEME_KEY = 'quote_calculator_theme';

const EMPTY_JOB = (id) => ({
  id,
  name: `Job ${id}`,
  parts: [],
  laborHrs: '',
  laborCost: '',
  description: '',
});

const migrateJobParts = (parts) => {
  if (Array.isArray(parts)) {
    return parts.map((p) => ({
      partNumber: p.partNumber ?? '',
      name: p.name ?? '',
      price: p.price ?? '',
      quantity: p.quantity ?? 1,
    }));
  }
  const num = Number(parts) || 0;
  return num > 0 ? [{ partNumber: '', name: 'Parts', price: num, quantity: 1 }] : [];
};

const NAV_TABS = [
  { id: 'quote',     label: 'Quote Calculator', icon: <IconQuote /> },
  { id: 'templates', label: 'Job Templates',    icon: <IconTemplates /> },
  { id: 'inventory', label: 'Inventory',        icon: <IconInventory /> },
  { id: 'settings',  label: 'Settings',         icon: <IconSettings /> },
];

function App() {
  const [activeView, setActiveView] = useState('quote');
  const [jobs, setJobs] = useState([EMPTY_JOB(1)]);
  const [jobCounter, setJobCounter] = useState(1);
  const [rates, setRates] = useState(() => loadGlobalRates());
  const [businessInfo, setBusinessInfo] = useState(() => loadBusinessInfo());
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [vehicle, setVehicle] = useState({ year: '', make: '', model: '', trim: '', vin: '', mileage: '' });
  const [currentQuoteId, setCurrentQuoteId] = useState(null);
  const [quoteNumber, setQuoteNumber] = useState(() => getCurrentQuoteNumber());
  const [history, setHistory] = useState(() => {
    const h = getHistoryIndex();
    return h.sort((a, b) => b.timestamp - a.timestamp);
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return saved ? saved === 'dark' : prefersDark;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [partPickerJobId, setPartPickerJobId] = useState(null);

  const resultsRef = useRef(null);
  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const totals = useMemo(() => {
    let grandLaborCost = 0;
    let grandLaborHours = 0;
    let grandPartsTotal = 0;
    let grandSsTotal = 0;

    const jobSummaries = jobs.map((job) => {
      const partsTotal = job.parts.reduce(
        (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
        0
      );
      const laborHrs = Number(job.laborHrs) || 0;
      const laborCost = Number(job.laborCost) || 0;
      const ssPercentage = rates.ssRate * 0.01;
      let ssTotal = ssPercentage * laborCost;
      if (ssTotal > rates.ssMax) ssTotal = rates.ssMax;
      const subtotal = laborCost + partsTotal + ssTotal;

      grandLaborCost += laborCost;
      grandLaborHours += laborHrs;
      grandPartsTotal += partsTotal;
      grandSsTotal += ssTotal;

      return { id: job.id, name: job.name || `Job ${job.id}`, laborCost, laborHrs, partsTotal, ssTotal, subtotal };
    });

    const taxableAmount = grandPartsTotal + grandSsTotal;
    const taxTotal = taxableAmount * (rates.taxRate * 0.01);
    const grandTotal = grandLaborCost + grandPartsTotal + grandSsTotal + taxTotal;

    return { jobSummaries, laborCost: grandLaborCost, laborHours: grandLaborHours, partsTotal: grandPartsTotal, ssTotal: grandSsTotal, taxTotal, grandTotal };
  }, [jobs, rates]);

  const refreshHistory = () => {
    const h = getHistoryIndex();
    h.sort((a, b) => b.timestamp - a.timestamp);
    setHistory(h);
  };

  const handleRatesChange = (newRates) => { setRates(newRates); saveGlobalRates(newRates); };

  const handleBusinessChange = (info) => { setBusinessInfo(info); saveBusinessInfo(info); };

  const handleAddJob = () => {
    const newId = jobCounter + 1;
    setJobCounter(newId);
    setJobs((prev) => [...prev, EMPTY_JOB(newId)]);
  };

  const handleUpdateJob = (id, field, value) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const updated = { ...j, [field]: value };
        if (field === 'laborHrs') {
          const computed = (Number(value) || 0) * rates.laborRate;
          updated.laborCost = computed > 0 ? computed.toFixed(2) : '';
        }
        return updated;
      })
    );
  };

  const handleRemoveJob = (id) => setJobs((prev) => prev.filter((j) => j.id !== id));

  const EMPTY_VEHICLE = { year: '', make: '', model: '', trim: '', vin: '', mileage: '' };

  const handleNewQuote = () => {
    setCurrentQuoteId(null);
    setQuoteNumber(getCurrentQuoteNumber());
    setCustomerName('');
    setPhone('');
    setNotes('');
    setVehicle(EMPTY_VEHICLE);
    setRates(loadGlobalRates());
    setJobCounter(1);
    setJobs([EMPTY_JOB(1)]);
  };

  const buildQuoteData = () => ({
    customerName: customerName.trim(),
    phone,
    notes,
    vehicle,
    rates,
    jobs: jobs.map((j) => ({
      name: j.name,
      parts: j.parts.map((p) => ({
        partNumber: p.partNumber || '',
        name: p.name,
        price: Number(p.price) || 0,
        quantity: Number(p.quantity) || 1,
      })),
      laborHrs: Number(j.laborHrs) || 0,
      laborCost: Number(j.laborCost) || 0,
      description: j.description,
    })),
    grandTotal: totals.grandTotal,
  });

  const handleSaveQuote = () => {
    if (!customerName.trim()) { toast('Please enter a customer name before saving.', 'error'); return; }
    const savedNumber = saveQuote(buildQuoteData());
    setCurrentQuoteId(savedNumber);
    setQuoteNumber(savedNumber);
    refreshHistory();
    toast(`Quote #${savedNumber} saved successfully!`);
  };

  const handleUpdateQuote = () => {
    if (!currentQuoteId) return;
    if (!customerName.trim()) { toast('Please enter a customer name before saving.', 'error'); return; }
    updateQuote(currentQuoteId, buildQuoteData());
    refreshHistory();
    toast(`Quote #${currentQuoteId} updated successfully!`);
  };

  const handleLoadQuote = (quoteId) => {
    const quote = getQuote(quoteId);
    if (!quote) { toast('Quote not found.', 'error'); return; }
    setCurrentQuoteId(quoteId);
    setQuoteNumber(quoteId);
    setCustomerName(quote.customerName || '');
    setPhone(quote.phone || '');
    setNotes(quote.notes || '');
    setVehicle(quote.vehicle || EMPTY_VEHICLE);
    if (quote.rates) setRates(quote.rates);
    if (quote.jobs && quote.jobs.length > 0) {
      const loaded = quote.jobs.map((jobData, i) => ({
        id: i + 1,
        name: jobData.name || `Job ${i + 1}`,
        parts: migrateJobParts(jobData.parts),
        laborHrs: jobData.laborHrs?.toString() || '',
        laborCost: jobData.laborCost?.toString() || '',
        description: jobData.description || '',
      }));
      setJobs(loaded);
      setJobCounter(loaded.length);
    } else {
      setJobs([EMPTY_JOB(1)]);
      setJobCounter(1);
    }
  };

  const handleDeleteHistoryQuote = (quoteId) => {
    if (!window.confirm(`Delete Quote #${quoteId}? This cannot be undone.`)) return;
    deleteQuote(quoteId);
    if (currentQuoteId === quoteId) handleNewQuote();
    else refreshHistory();
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      refreshHistory();
    } else {
      const results = searchQuotes(term);
      results.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(results);
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setModalOpen(false);
    handleNewQuote();
  };

  const handleCalculate = () => resultsRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handlePrint = () => {
    printQuote({ quoteNumber, customerName, phone, notes, vehicle, jobs, rates, totals, businessInfo });
  };

  const handleSaveAsTemplate = (job) => {
    saveJobTemplate({
      name: job.name,
      description: job.description || '',
      laborHrs: Number(job.laborHrs) || 0,
      laborCost: Number(job.laborCost) || 0,
      parts: job.parts.map((p) => ({
        partNumber: p.partNumber || '',
        name: p.name || '',
        price: Number(p.price) || 0,
        quantity: Number(p.quantity) || 1,
      })),
    });
    toast(`Template "${job.name}" saved.`);
  };

  const handleApplyTemplate = (template) => {
    const newId = jobCounter + 1;
    setJobCounter(newId);
    setJobs((prev) => [
      ...prev,
      {
        id: newId,
        name: template.name,
        parts: template.parts.map((p) => ({
          partNumber: p.partNumber || '',
          name: p.name || '',
          price: p.price?.toString() || '',
          quantity: p.quantity ?? 1,
        })),
        laborHrs: template.laborHrs ? template.laborHrs.toString() : '',
        laborCost: template.laborCost ? template.laborCost.toString() : '',
        description: template.description || '',
      },
    ]);
  };

  const handleAddPartFromInventory = (jobId, part) => {
    setJobs((prev) =>
      prev.map((j) => j.id === jobId ? { ...j, parts: [...j.parts, part] } : j)
    );
  };

  return (
    <div className="app-root">
      <Header />
      <nav className="main-nav">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`main-nav-tab${activeView === tab.id ? ' active' : ''}`}
            onClick={() => setActiveView(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
      <Modal
        isOpen={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={handleClearHistory}
      />
      <PartPickerModal
        isOpen={partPickerJobId !== null}
        onClose={() => setPartPickerJobId(null)}
        onAddPart={(part) => handleAddPartFromInventory(partPickerJobId, part)}
      />
      <main>
        {activeView === 'quote' && (
          <div className="calculator-layout">
            <HistorySidebar
              history={history}
              searchTerm={searchTerm}
              onSearch={handleSearch}
              onLoadQuote={handleLoadQuote}
              onDeleteQuote={handleDeleteHistoryQuote}
            />
            <div className="calculator-container">
              <QuoteInfo
                quoteNumber={quoteNumber}
                customerName={customerName}
                setCustomerName={setCustomerName}
                phone={phone}
                setPhone={setPhone}
                onNewQuote={handleNewQuote}
              />
              <VehicleSection vehicle={vehicle} onChange={setVehicle} />
              <NotesSection notes={notes} onChange={setNotes} />
              <JobsSection
                jobs={jobs}
                totals={totals}
                onAddJob={handleAddJob}
                onUpdateJob={handleUpdateJob}
                onRemoveJob={handleRemoveJob}
                onSaveAsTemplate={handleSaveAsTemplate}
                onOpenPartPicker={(jobId) => setPartPickerJobId(jobId)}
                onApplyTemplate={handleApplyTemplate}
              />
              <div className="action-buttons">
                <button type="button" className="btn" onClick={handleCalculate}>
                  Calculate Total
                </button>
                <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                  Print Quote
                </button>
                {currentQuoteId && (
                  <button type="button" className="btn btn-success" onClick={handleSaveQuote}>
                    Save as New
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${currentQuoteId ? 'btn-warning' : 'btn-success'}`}
                  onClick={currentQuoteId ? handleUpdateQuote : handleSaveQuote}
                >
                  {currentQuoteId ? `Update #${currentQuoteId}` : 'Save Quote'}
                </button>
              </div>
              <ResultsSection ref={resultsRef} totals={totals} />
            </div>
            <TasksPanel />
          </div>
        )}
        {activeView === 'templates' && (
          <TemplatesPage
            onApplyTemplate={handleApplyTemplate}
            onSwitchToQuote={() => setActiveView('quote')}
            onToast={toast}
          />
        )}
        {activeView === 'inventory' && (
          <InventoryPage onToast={toast} />
        )}
        {activeView === 'settings' && (
          <SettingsPage
            rates={rates}
            onRatesChange={handleRatesChange}
            businessInfo={businessInfo}
            onBusinessChange={handleBusinessChange}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onClearHistory={() => setModalOpen(true)}
          />
        )}
      </main>
      <Footer
        activeView={activeView}
        onSetView={setActiveView}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default App;
