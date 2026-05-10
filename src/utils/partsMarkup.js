export const DEFAULT_MARKUP_MATRIX = [
  { max: 1,    markupPct: 100 },
  { max: 10,   markupPct: 75  },
  { max: 25,   markupPct: 50  },
  { max: 150,  markupPct: 45  },
  { max: 300,  markupPct: 40  },
  { max: 500,  markupPct: 30  },
  { max: 1000, markupPct: 25  },
  { max: 5000, markupPct: 20  },
  { max: null, markupPct: 15  }, // null = no upper bound
];

// Returns the incremental markup dollars and blended effective rate for a given cost.
// matrix: array of { max: number|null, markupPct: number }
// maxMarkupDollars: optional cap on total markup amount
export function calcIncrementalMarkup(cost, matrix, maxMarkupDollars = null) {
  const c = Number(cost);
  if (!c || c <= 0) return { markupDollars: 0, effectiveRate: 0 };

  const sorted = [...matrix].sort((a, b) => {
    if (a.max === null) return 1;
    if (b.max === null) return -1;
    return a.max - b.max;
  });

  let totalMarkup = 0;
  let prevMax = 0;

  for (const bracket of sorted) {
    if (c <= prevMax) break;
    const bracketMax = bracket.max === null ? c : bracket.max;
    const inBracket = Math.min(c, bracketMax) - prevMax;
    if (inBracket > 0) totalMarkup += inBracket * (bracket.markupPct / 100);
    prevMax = bracketMax;
  }

  if (maxMarkupDollars != null) {
    totalMarkup = Math.min(totalMarkup, maxMarkupDollars);
  }

  return {
    markupDollars: totalMarkup,
    effectiveRate: (totalMarkup / c) * 100,
  };
}

// Convenience: returns the full sell price (cost + markup).
export function calculateSellPrice(cost, matrix, maxMarkupDollars = null) {
  const c = Number(cost);
  if (!c || c <= 0) return 0;
  const { markupDollars } = calcIncrementalMarkup(c, matrix, maxMarkupDollars);
  return c + markupDollars;
}

export function grossProfitPct(markupPct) {
  const n = Number(markupPct);
  return n > 0 ? (n / (100 + n)) * 100 : 0;
}
