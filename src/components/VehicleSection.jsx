import { useState, useEffect, useMemo } from "react";
import validateVin from "../utils/validateVin";
import {
  getCustomerVehicles,
  saveCustomerVehicle,
  updateCustomerVehicle,
  deleteCustomerVehicle,
} from "../storage";

// Module-level cache — survives re-renders and re-mounts, fetched at most once per session
// null = not yet fetched | false = fetch failed | string[] = loaded
let _makesCache = null;

const DECODE_FILL = [
  ["Make", "make"],
  ["Model", "model"],
  ["Trim", "trim"],
  ["Model Year", "year"],
];

const DISPLAY_FIELDS = [
  ["Model Year", "Model Year"],
  ["Make", "Make"],
  ["Model", "Model"],
  ["Trim", "Trim"],
  ["Body Class", "Body Class"],
  ["Vehicle Type", "Vehicle Type"],
  ["Fuel Type", "Fuel Type - Primary"],
  ["Engine Cylinders", "Engine Number of Cylinders"],
  ["Displacement (L)", "Displacement (L)"],
  ["Drive Type", "Drive Type"],
  ["Transmission Style", "Transmission Style"],
  ["Plant Country", "Plant Country"],
];

// ── Decode dialog ─────────────────────────────────────────────────────────────

function DecodeDialog({ result, onClose }) {
  return (
    <div
      className="modal-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal vin-dialog">
        <div className="library-modal-header">
          <h3>VIN — {result.vin}</h3>
          <button className="btn-remove" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="vin-dialog-body">
          {result.warning && (
            <div className="vin-warning">{result.warning}</div>
          )}
          <table className="vin-table">
            <tbody>
              {result.details.map(([label, value]) => (
                <tr key={label}>
                  <td className="vin-table-label">{label}</td>
                  <td className="vin-table-value">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Vehicle Picker Strip ──────────────────────────────────────────────────────

function vehicleLabel(v) {
  const parts = [v.year, v.make, v.model, v.trim].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unknown Vehicle";
}

function VehiclePickerStrip({ customerId, vehicle, onChange }) {
  const [saved, setSaved] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    setSaved(getCustomerVehicles(customerId));
    setSelectedId(null);
  }, [customerId]);

  const refresh = () => setSaved(getCustomerVehicles(customerId));

  const handleSelect = (v) => {
    const { id, createdAt, ...fields } = v;
    onChange(fields);
    setSelectedId(v.id);
  };

  const handleDelete = (e, v) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${vehicleLabel(v)}"?`)) return;
    deleteCustomerVehicle(customerId, v.id);
    if (selectedId === v.id) setSelectedId(null);
    refresh();
  };

  const handleSave = () => {
    const hasData = vehicle.year || vehicle.make || vehicle.model;
    if (!hasData) return;
    if (selectedId) {
      updateCustomerVehicle(customerId, selectedId, vehicle);
    } else {
      const created = saveCustomerVehicle(customerId, vehicle);
      setSelectedId(created.id);
    }
    refresh();
  };

  return (
    <div className="vehicle-picker">
      <div className="vehicle-picker-header">
        <span className="vehicle-picker-label">Saved Vehicles</span>
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={handleSave}
          disabled={!vehicle.year && !vehicle.make && !vehicle.model}
        >
          {selectedId ? "Update Vehicle" : "Save Vehicle"}
        </button>
      </div>
      {saved.length === 0 ? (
        <span className="vehicle-picker-empty">
          No vehicles saved — fill in the form below and click Save Vehicle.
        </span>
      ) : (
        <div className="vehicle-picker-chips">
          {saved.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`vehicle-chip${selectedId === v.id ? " selected" : ""}`}
              onClick={() => handleSelect(v)}
            >
              <span>{vehicleLabel(v)}</span>
              <span
                className="vehicle-chip-delete"
                role="button"
                onClick={(e) => handleDelete(e, v)}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function VehicleSection({ vehicle, onChange, customerId }) {
  const [rawMakes, setRawMakes] = useState(_makesCache);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState("");
  const [decodeResult, setDecodeResult] = useState(null);

  // Fetch all makes once per session; skip if already cached
  useEffect(() => {
    if (_makesCache !== null) return;
    fetch(
      "https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json",
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        _makesCache = data.Results.map((r) => r.MakeName);
        setRawMakes(_makesCache);
      })
      .catch(() => {
        _makesCache = false;
        setRawMakes(false);
      });
  }, []);

  // Sort and deduplicate — only recomputes when rawMakes reference changes
  const makes = useMemo(() => {
    if (!rawMakes || rawMakes === false) return null;
    return [...new Set(rawMakes)].sort((a, b) => a.localeCompare(b));
  }, [rawMakes]);

  const set = (field, value) => onChange({ ...vehicle, [field]: value });

  const handleDecodeVin = async () => {
    const vin = vehicle.vin.trim().toUpperCase();
    if (vin.length !== 17) {
      setDecodeError("VIN must be exactly 17 characters.");
      return;
    }
    const isValidVin = validateVin(vehicle.vin);
    if (!isValidVin) {
      setDecodeError("Invalid VIN format.");
      return;
    }

    setDecoding(true);
    setDecodeError("");
    setDecodeResult(null);

    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();

      const get = (variable) => {
        const r = data.Results.find((x) => x.Variable === variable);
        return r?.Value && r.Value !== "Not Applicable" ? r.Value : "";
      };

      const updates = {};
      for (const [apiField, stateField] of DECODE_FILL) {
        const val = get(apiField);
        if (!val) continue;
        // Normalize make casing to match the makes list if available
        if (stateField === "make" && makes) {
          const match = makes.find(
            (m) => m.toLowerCase() === val.toLowerCase(),
          );
          updates.make = match ?? val;
        } else {
          updates[stateField] = val;
        }
      }
      if (Object.keys(updates).length) onChange({ ...vehicle, ...updates });

      const errorText = get("Error Text");
      const warning =
        errorText && errorText !== "0 - VIN decoded clean" ? errorText : "";

      const details = DISPLAY_FIELDS.map(([label, field]) => [
        label,
        get(field),
      ]).filter(([, v]) => v);

      setDecodeResult({ vin, details, warning });
    } catch {
      setDecodeError("Failed to reach NHTSA API. Check your connection.");
    } finally {
      setDecoding(false);
    }
  };

  // Make field: select when list is loaded, text input otherwise
  const makeField =
    makes ?
      <select
        value={vehicle.make}
        onChange={(e) => set("make", e.target.value)}
      >
        <option value="">Select make…</option>
        {/* Preserve a value that doesn't exist in the list (e.g. loaded from old quote) */}
        {vehicle.make && !makes.includes(vehicle.make) && (
          <option value={vehicle.make}>{vehicle.make}</option>
        )}
        {makes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    : <input
        type="text"
        placeholder={rawMakes === null ? "Loading makes…" : "e.g. Toyota"}
        value={vehicle.make}
        onChange={(e) => set("make", e.target.value)}
      />;

  return (
    <div className="vehicle-section">
      <h3>Vehicle Information</h3>
      {customerId && (
        <VehiclePickerStrip
          customerId={customerId}
          vehicle={vehicle}
          onChange={onChange}
        />
      )}
      <div className="vehicle-grid">
        <div className="form-group">
          <label>Year</label>
          <input
            type="text"
            placeholder="e.g. 2020"
            maxLength={4}
            value={vehicle.year}
            onChange={(e) => set("year", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Make</label>
          {makeField}
        </div>
        <div className="form-group">
          <label>Model</label>
          <input
            type="text"
            placeholder="e.g. Camry"
            value={vehicle.model}
            onChange={(e) => set("model", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Trim</label>
          <input
            type="text"
            placeholder="e.g. SE"
            value={vehicle.trim}
            onChange={(e) => set("trim", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Mileage</label>
          <input
            type="text"
            placeholder="e.g. 45000"
            value={vehicle.mileage}
            onChange={(e) => set("mileage", e.target.value)}
          />
        </div>
        <div className="form-group vehicle-vin">
          <label>VIN</label>
          <div className="vin-input-row">
            <input
              type="text"
              placeholder="17-character VIN"
              value={vehicle.vin}
              maxLength={17}
              onChange={(e) => {
                set("vin", e.target.value.toUpperCase());
                setDecodeError("");
              }}
            />
            <button
              type="button"
              className="btn-small"
              onClick={handleDecodeVin}
              disabled={decoding || vehicle.vin.trim().length !== 17}
            >
              {decoding ? "Decoding…" : "Decode VIN"}
            </button>
          </div>
          {decodeError && <span className="vin-error">{decodeError}</span>}
        </div>
      </div>

      {decodeResult && (
        <DecodeDialog
          result={decodeResult}
          onClose={() => setDecodeResult(null)}
        />
      )}
    </div>
  );
}

export default VehicleSection;
