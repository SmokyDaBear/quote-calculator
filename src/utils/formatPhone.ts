export function formatPhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Display 11-digit numbers with leading 1 as 1-XXX-XXX-XXXX
  if (digits.length === 11 && digits[0] === "1") {
    return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw || "";
}

// For use in onChange handlers — formats progressively as the user types.
// Supports standard 10-digit (XXX-XXX-XXXX) and country-code 11-digit (1-XXX-XXX-XXXX).
// NANP area codes never start with 0 or 1, so a leading "1" digit unambiguously signals the country code.
export function formatPhoneInput(raw: string): string {
  const allDigits = String(raw || "")
    .replace(/\D/g, "")
    .slice(0, 13); // Allow up to 13 digits for input (3 for country code + 10 for the rest)
  if (allDigits.length > 10) {
    const endOfValid = allDigits.length;
    const startOfRest = endOfValid - 10;
    const rest = allDigits.slice(startOfRest, endOfValid);
    const first = allDigits.slice(0, startOfRest);
    return `${first}-${rest.slice(0, 3)}-${rest.slice(3, 6)}-${rest.slice(6)}`;
  }

  const d = allDigits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.startsWith("1")) {
    if (d.length <= 4) return `1-${d.slice(1)}`;
    if (d.length <= 7) return `1-${d.slice(1, 4)}-${d.slice(4)}`;
    return `1-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}
