function RatesSection({ rates, onChange }) {
  const handleChange = (field, value) => {
    const updated = { ...rates, [field]: Number(value) };
    onChange(updated);
  };

  return (
    <div className="rates-section">
      <h3>Global Rates</h3>
      <div className="rates-grid">
        <div className="form-group">
          <label htmlFor="tax-rate">Tax Rate (%)</label>
          <input
            id="tax-rate"
            type="number"
            step="0.01"
            value={rates.taxRate}
            onChange={(e) => handleChange('taxRate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="labor-rate">Labor Rate ($/hr)</label>
          <input
            id="labor-rate"
            type="number"
            step="0.01"
            value={rates.laborRate}
            onChange={(e) => handleChange('laborRate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="ss-rate">SS Rate (%)</label>
          <input
            id="ss-rate"
            type="number"
            step="0.01"
            value={rates.ssRate}
            onChange={(e) => handleChange('ssRate', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="ss-max">SS Max ($)</label>
          <input
            id="ss-max"
            type="number"
            step="0.01"
            value={rates.ssMax}
            onChange={(e) => handleChange('ssMax', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default RatesSection;
