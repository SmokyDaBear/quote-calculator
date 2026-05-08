const VIN_REGEX = /\b([A-HJ-NPR-Z0-9]{17})\b/;

export default function validateVin(vin) {
  if (typeof vin !== "string") return false;
  return VIN_REGEX.test(vin.trim().toUpperCase());
}
