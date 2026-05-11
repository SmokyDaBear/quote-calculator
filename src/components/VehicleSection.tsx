import { useState, useEffect, useMemo } from "react";
import validateVin from "../utils/validateVin";
import {
  getCustomerVehicles,
  saveCustomerVehicle,
  updateCustomerVehicle,
  deleteCustomerVehicle,
} from "../storage";
import type { Vehicle } from "../types/index";
import type { MakeResponse, ModelResponse } from "../utils/VehicleApi";
import { VehicleApi } from "../utils/VehicleApi";

const YEARS: number[] = Array.from(
  { length: 100 },
  (_, i) => new Date().getFullYear() + 1 - i,
);

const DECODE_FILL: [string, string][] = [
  ["Make", "make"],
  ["Model", "model"],
  ["Trim", "trim"],
  ["Model Year", "year"],
];

const DISPLAY_FIELDS: [string, string][] = [
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

type MakesCache = MakeResponse[] | false | null;
let _makesCache: MakesCache = null;

type DecodeResult = {
  vin: string;
  details: [string, string][];
  warning: string;
};

function DecodeDialog({
  result,
  onClose,
}: {
  result: DecodeResult;
  onClose: () => void;
}) {
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
          <button
            type="button"
            className="btn-remove"
            onClick={onClose}
          >
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

type VehicleFields = {
  year: string;
  make: string;
  model: string;
  trim: string;
  vin: string;
  mileage: string;
};

function vehicleLabel(v: Partial<Vehicle>) {
  const parts = [v.year, v.make, v.model, v.trim].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unknown Vehicle";
}

function VehiclePickerStrip({
  customerId,
  vehicle,
  onChange,
}: {
  customerId: string;
  vehicle: VehicleFields;
  onChange: (v: VehicleFields) => void;
}) {
  const [saved, setSaved] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = () => getCustomerVehicles(customerId).then(setSaved);

  useEffect(() => {
    refresh();
    setSelectedId(null);
  }, [customerId]);

  const handleSelect = (v: Vehicle) => {
    onChange({
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      vin: v.vin,
      mileage: v.mileage,
    });
    setSelectedId(v.id);
  };

  const handleDelete = async (e: React.MouseEvent, v: Vehicle) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${vehicleLabel(v)}"?`)) return;
    await deleteCustomerVehicle(customerId, v.id);
    if (selectedId === v.id) setSelectedId(null);
    refresh();
  };

  const handleSave = async () => {
    const hasData = vehicle.year || vehicle.make || vehicle.model;
    if (!hasData) return;
    if (selectedId) {
      await updateCustomerVehicle(customerId, selectedId, vehicle);
    } else {
      const created = await saveCustomerVehicle(customerId, {
        ...vehicle,
        color: "",
        notes: "",
      });
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
      {saved.length === 0 ?
        <span className="vehicle-picker-empty">
          No vehicles saved — fill in the form below and click Save Vehicle.
        </span>
      : <div className="vehicle-picker-chips">
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
      }
    </div>
  );
}

function VehicleSection({
  vehicle,
  onChange,
  customerId,
}: {
  vehicle: VehicleFields;
  onChange: (v: VehicleFields) => void;
  customerId: string | null;
}) {
  const [rawMakes, setRawMakes] = useState<MakesCache>(_makesCache);
  const [rawModels, setRawModels] = useState<ModelResponse[] | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState("");
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);

  // Load makes once when a year is first selected
  useEffect(() => {
    if (!vehicle.year) return;
    if (_makesCache !== null) return;
    VehicleApi.getMakes({})
      .then((data) => {
        _makesCache = data.Results;
        setRawMakes(data.Results);
      })
      .catch(() => {
        _makesCache = false;
        setRawMakes(false);
      });
  }, [vehicle.year]);

  // Load models whenever year+make both change
  useEffect(() => {
    if (!vehicle.make || !vehicle.year) {
      setRawModels(null);
      return;
    }
    setRawModels(null);
    VehicleApi.getModels({ make: vehicle.make, year: Number(vehicle.year) })
      .then((data) => setRawModels(data.Results))
      .catch(() => setRawModels([]));
  }, [vehicle.make, vehicle.year]);

  const makes = useMemo(() => {
    if (!rawMakes) return null;
    return [
      ...new Set((rawMakes as MakeResponse[]).map((m) => m.MakeName)),
    ].sort((a, b) => a.localeCompare(b));
  }, [rawMakes]);

  const models = useMemo(() => {
    if (!rawModels) return null;
    return [...new Set(rawModels.map((m) => m.Model_Name))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rawModels]);

  const set = (field: string, value: string) =>
    onChange({ ...vehicle, [field]: value });

  const handleDecodeVin = async () => {
    const vin = vehicle.vin.trim().toUpperCase();
    if (vin.length !== 17) {
      setDecodeError("VIN must be exactly 17 characters.");
      return;
    }
    if (!validateVin(vehicle.vin)) {
      setDecodeError("Invalid VIN format.");
      return;
    }

    setDecoding(true);
    setDecodeError("");
    setDecodeResult(null);

    try {
      const data = await VehicleApi.decodeVin({ vin });

      const get = (variable: string) => {
        const r = data.Results.find((x) => x.Variable === variable);
        return r?.Value && r.Value !== "Not Applicable" ? r.Value : "";
      };

      const updates: Record<string, string> = {};
      for (const [apiField, stateField] of DECODE_FILL) {
        const val = get(apiField);
        if (!val) continue;
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
      const details = DISPLAY_FIELDS.map(
        ([label, field]) => [label, get(field)] as [string, string],
      ).filter(([, v]) => v);
      setDecodeResult({ vin, details, warning });
    } catch {
      setDecodeError("Failed to reach NHTSA API. Check your connection.");
    } finally {
      setDecoding(false);
    }
  };

  const makeDisabled = !vehicle.year;
  const modelDisabled = !vehicle.year || !vehicle.make;

  const makeField =
    makes ?
      <select
        aria-label="Make"
        value={vehicle.make}
        disabled={makeDisabled}
        onChange={(e) => {
          setRawModels(null);
          onChange({ ...vehicle, make: e.target.value, model: "", trim: "" });
        }}
      >
        <option value="">Select make…</option>
        {vehicle.make && !makes.includes(vehicle.make) && (
          <option value={vehicle.make}>{vehicle.make}</option>
        )}
        {makes.map((m) => (
          <option
            key={m}
            value={m}
          >
            {m}
          </option>
        ))}
      </select>
    : <input
        type="text"
        disabled={makeDisabled}
        placeholder={
          !vehicle.year ? "Select year first"
          : rawMakes === null ?
            "Loading makes…"
          : "e.g. Toyota"
        }
        value={vehicle.make}
        onChange={(e) =>
          onChange({ ...vehicle, make: e.target.value, model: "", trim: "" })
        }
      />;

  const modelField =
    models ?
      <select
        aria-label="Model"
        value={vehicle.model}
        disabled={modelDisabled}
        onChange={(e) => set("model", e.target.value)}
      >
        <option value="">Select model…</option>
        {vehicle.model && !models.includes(vehicle.model) && (
          <option value={vehicle.model}>{vehicle.model}</option>
        )}
        {models.map((m) => (
          <option
            key={m}
            value={m}
          >
            {m}
          </option>
        ))}
      </select>
    : <input
        type="text"
        disabled={modelDisabled}
        placeholder={
          !vehicle.year ? "Select year first"
          : !vehicle.make ?
            "Select make first"
          : rawModels === null ?
            "Loading models…"
          : "e.g. Camry"
        }
        value={vehicle.model}
        onChange={(e) => set("model", e.target.value)}
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
          <select
            aria-label="Year"
            value={vehicle.year}
            onChange={(e) => {
              setRawModels(null);
              onChange({ ...vehicle, year: e.target.value, make: "", model: "", trim: "" });
            }}
          >
            <option value="">Year..</option>
            {YEARS.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Make</label>
          {makeField}
        </div>
        <div className="form-group">
          <label>Model</label>
          {modelField}
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
