export function formatPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Strip leading country code 1 for 11-digit US numbers
  if (digits.length === 11 && digits[0] === "1") {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw || "";
}

// For use in onChange handlers — formats progressively as the user types.
// Keeps only digits and dashes, inserting dashes at the right positions.
export function formatPhoneInput(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
