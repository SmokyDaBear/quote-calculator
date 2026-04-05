const STORAGE_KEY = "quote_calculator_history";
const QUOTE_COUNTER_KEY = "quote_calculator_counter";
const RATES_KEY = "quote_calculator_rates";

// Default rates
const DEFAULT_RATES = {
  taxRate: 8.52,
  laborRate: 215,
  ssRate: 15,
  ssMax: 54.95
};

// Save global rates to localStorage
const saveGlobalRates = (rates) => {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
};

// Load global rates from localStorage (returns defaults if not found)
const loadGlobalRates = () => {
  const saved = localStorage.getItem(RATES_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      taxRate: parsed.taxRate ?? DEFAULT_RATES.taxRate,
      laborRate: parsed.laborRate ?? DEFAULT_RATES.laborRate,
      ssRate: parsed.ssRate ?? DEFAULT_RATES.ssRate,
      ssMax: parsed.ssMax ?? DEFAULT_RATES.ssMax
    };
  }
  return { ...DEFAULT_RATES };
};

// Load global rates asynchronously
const loadGlobalRatesAsync = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(loadGlobalRates());
    }, 0);
  });
};

// Get next quote number
const getNextQuoteNumber = () => {
  const current = localStorage.getItem(QUOTE_COUNTER_KEY);
  const next = current ? parseInt(current, 10) + 1 : 1001;
  localStorage.setItem(QUOTE_COUNTER_KEY, next.toString());
  return next;
};

// Get current quote number without incrementing
const getCurrentQuoteNumber = () => {
  const current = localStorage.getItem(QUOTE_COUNTER_KEY);
  return current ? parseInt(current, 10) + 1 : 1001;
};

// Clear all history
const clearHistory = () => {
  const history = getHistoryIndex();
  if (history.length === 0) return;

  for (const { id } of history) {
    localStorage.removeItem(`quote_${id}`);
  }

  localStorage.removeItem(STORAGE_KEY);
};

// Get history index (list of quote metadata)
const getHistoryIndex = () => {
  const history = localStorage.getItem(STORAGE_KEY);
  return history ? JSON.parse(history) : [];
};

// Load history asynchronously
const loadHistoryAsync = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getHistoryIndex());
    }, 0);
  });
};

// Save a quote to history
const saveQuote = (quoteData) => {
  const history = getHistoryIndex();
  const quoteNumber = getNextQuoteNumber();
  const timestamp = Date.now();
  
  // Create index entry with metadata
  const indexEntry = {
    id: quoteNumber,
    customerName: quoteData.customerName || 'Unknown',
    timestamp,
    grandTotal: quoteData.grandTotal || 0
  };
  
  history.push(indexEntry);
  
  // Save full quote data
  localStorage.setItem(`quote_${quoteNumber}`, JSON.stringify({
    ...quoteData,
    quoteNumber,
    timestamp
  }));
  
  // Update index
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  
  return quoteNumber;
};

// Get a specific quote by number
const getQuote = (quoteNumber) => {
  const data = localStorage.getItem(`quote_${quoteNumber}`);
  return data ? JSON.parse(data) : null;
};

// Load a quote asynchronously
const loadQuoteAsync = (quoteNumber) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getQuote(quoteNumber));
    }, 0);
  });
};

// Delete a quote
const deleteQuote = (quoteNumber) => {
  const history = getHistoryIndex();
  const filtered = history.filter(h => h.id !== quoteNumber);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  localStorage.removeItem(`quote_${quoteNumber}`);
};

// Search quotes by customer name
const searchQuotes = (searchTerm) => {
  const history = getHistoryIndex();
  const term = searchTerm.toLowerCase();
  return history.filter(h => 
    h.customerName.toLowerCase().includes(term) ||
    h.id.toString().includes(term)
  );
};
