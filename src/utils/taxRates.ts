const TAX_API_VERSION = "v1";

const TAX_API_URL = `https://api.opensalestax.org/${TAX_API_VERSION}`;

const ERRORS = {
  serverDown: "Open Sales Tax API is currently down. Try again later.",
  databaseDown:
    "Sales tax API database is currently disconnected. Try again later.",
  invalidZip: "Zip code is not in a valid format.",
  unknown: "An unknown error has occurred.",
};

const zip5 = (zip: string) => (/^\d{5}$/.test(zip) ? `?zip5=${zip}` : "");
const zip4 = (zip?: string) => (zip && /^\d{4}$/.test(zip) ? `&zip4=${zip}` : "");

export type HealthCheckResponse = {
  status: string;
  version: string;
  database_connected: boolean;
};

export type ZipCheckResponse = {
  input: {
    zip5: number | null;
    zip4: number | null;
  };
  jurisdictions: {
    name: string;
    type: string;
    rate_pct: number;
    tax: null;
  }[];
  combined_rate_pct: number;
  disclaimer: string;
  coverage_warning: string;
};

const isHealthCheckResponse = (
  data: unknown,
): data is HealthCheckResponse =>
  typeof data === "object" &&
  data !== null &&
  "status" in data &&
  "database_connected" in data;

const getHealthCheckErrorMessage = (data: HealthCheckResponse) => {
  if (data?.status !== "ok") return ERRORS.serverDown;
  if (data?.database_connected !== true) return ERRORS.databaseDown;
  return ERRORS.unknown;
};

/** Accepts a rate as a JSON number or a numeric string. */
const toRate = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/** Pulls a ZIP (or ZIP+4) out of a free-form address line. */
export const extractZip = (address: string): string => {
  const matches = address.match(/\b\d{5}(?:-\d{4})?\b/g);
  return matches ? matches[matches.length - 1] : "";
};

/** Splits "12345-6789" (or any punctuation) into ["12345", "6789"]. The +4 is
 *  optional — anything that isn't a full four digits is dropped. */
const splitParts = (zip: string): [string, string?] => {
  const parsed = zip.replace(/\D/g, "");
  const first = parsed.slice(0, 5);
  const last = parsed.slice(5, 9);
  if (first.length !== 5) throw new Error(ERRORS.invalidZip);
  return last.length === 4 ? [first, last] : [first];
};

export const getTaxRates = async (zip: string): Promise<ZipCheckResponse> => {
  const [first, last] = splitParts(zip);
  const response = await fetch(TAX_API_URL + "/rates" + zip5(first) + zip4(last));

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(response.ok ? ERRORS.unknown : ERRORS.serverDown);
  }

  if (!response.ok) {
    // A failed lookup comes back as the health-check payload.
    if (isHealthCheckResponse(data)) {
      throw new Error(getHealthCheckErrorMessage(data));
    }
    throw new Error(
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : ERRORS.unknown,
    );
  }

  if (typeof data !== "object" || data === null) {
    throw new Error(ERRORS.unknown);
  }

  const raw = data as Record<string, unknown>;
  const jurisdictions = (Array.isArray(raw.jurisdictions) ? raw.jurisdictions : []).map(
    (j) => {
      const entry = j as Record<string, unknown>;
      return {
        name: String(entry.name ?? ""),
        type: String(entry.type ?? ""),
        rate_pct: toRate(entry.rate_pct) ?? 0,
        tax: null,
      };
    },
  );

  // Rates come back as JSON numbers on some deployments and strings on others;
  // fall back to summing the jurisdictions when the combined field is absent.
  const combined =
    toRate(raw.combined_rate_pct) ??
    (jurisdictions.length > 0
      ? jurisdictions.reduce((sum, j) => sum + j.rate_pct, 0)
      : null);

  if (combined === null) {
    // No usable rate — now a health-check payload is the meaningful explanation.
    if (isHealthCheckResponse(data)) {
      throw new Error(getHealthCheckErrorMessage(data));
    }
    throw new Error(
      `${ERRORS.unknown} Unexpected response fields: ${Object.keys(raw).join(", ") || "none"}.`,
    );
  }

  return {
    input: (raw.input ?? { zip5: null, zip4: null }) as ZipCheckResponse["input"],
    jurisdictions,
    combined_rate_pct: combined,
    disclaimer: typeof raw.disclaimer === "string" ? raw.disclaimer : "",
    coverage_warning:
      typeof raw.coverage_warning === "string" ? raw.coverage_warning : "",
  };
};
