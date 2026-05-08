import { useState, useRef } from 'react';
import { DEFAULT_RATES } from '../storage';

function SettingsPage({ rates, onRatesChange, businessInfo, onBusinessChange, isDark, onToggleTheme, onClearHistory }) {
  const [ratesSaved, setRatesSaved] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const logoInputRef = useRef(null);

  const handleRateChange = (field, value) => {
    onRatesChange({ ...rates, [field]: Number(value) });
    setRatesSaved(false);
  };

  const handleReset = () => {
    onRatesChange({ ...DEFAULT_RATES });
    setRatesSaved(false);
  };

  const handleRatesSave = () => {
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2000);
  };

  const setBiz = (field, value) => {
    onBusinessChange({ ...businessInfo, [field]: value });
    setBizSaved(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onBusinessChange({ ...businessInfo, logo: ev.target.result });
      setBizSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBizSave = () => {
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="page-card settings-section">
        <h3 className="settings-section-title">Appearance</h3>
        <div className="settings-appearance-row">
          <span className="settings-appearance-label">Dark Mode</span>
          <div
            className={`toggle-switch${isDark ? ' active' : ''}`}
            onClick={onToggleTheme}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="page-card settings-section" style={{ marginTop: '1rem' }}>
        <h3 className="settings-section-title">Business Information</h3>
        <p className="settings-section-desc">
          Appears in the header of printed quotes.
        </p>
        <div className="biz-form">
          <div className="biz-logo-row">
            <div className="biz-logo-preview">
              {businessInfo.logo
                ? <img src={businessInfo.logo} alt="Logo" className="biz-logo-img" />
                : <span className="biz-logo-placeholder">No logo</span>
              }
            </div>
            <div className="biz-logo-actions">
              <button className="btn-small btn-secondary" onClick={() => logoInputRef.current.click()}>
                {businessInfo.logo ? 'Change Logo' : 'Upload Logo'}
              </button>
              {businessInfo.logo && (
                <button className="btn-small btn-danger-sm" onClick={() => setBiz('logo', '')}>
                  Remove
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
            </div>
          </div>
          <div className="lib-form-group">
            <label>Business Name</label>
            <input
              type="text"
              placeholder="Your Shop Name"
              value={businessInfo.name}
              onChange={(e) => setBiz('name', e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Phone</label>
            <input
              type="tel"
              placeholder="Business phone"
              value={businessInfo.phone}
              onChange={(e) => setBiz('phone', e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Address</label>
            <textarea
              className="lib-textarea"
              placeholder="Street, City, State ZIP"
              value={businessInfo.address}
              onChange={(e) => setBiz('address', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-actions">
          <button className="btn-small btn-success" onClick={handleBizSave}>
            {bizSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="page-card settings-section" style={{ marginTop: '1rem' }}>
        <h3 className="settings-section-title">Global Rates</h3>
        <p className="settings-section-desc">
          These defaults apply to all new quotes. Rates saved with a quote are preserved when you reload it.
        </p>
        <div className="settings-rates-grid">
          <div className="lib-form-group">
            <label>Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={rates.taxRate}
              onChange={(e) => handleRateChange('taxRate', e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Labor Rate ($/hr)</label>
            <input
              type="number"
              step="0.01"
              value={rates.laborRate}
              onChange={(e) => handleRateChange('laborRate', e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Shop Supplies Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={rates.ssRate}
              onChange={(e) => handleRateChange('ssRate', e.target.value)}
            />
          </div>
          <div className="lib-form-group">
            <label>Shop Supplies Max ($)</label>
            <input
              type="number"
              step="0.01"
              value={rates.ssMax}
              onChange={(e) => handleRateChange('ssMax', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-actions">
          <button className="btn-small btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="btn-small btn-success" onClick={handleRatesSave}>
            {ratesSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="page-card settings-section settings-danger-section" style={{ marginTop: '1rem' }}>
        <h3 className="settings-section-title">Data</h3>
        <p className="settings-section-desc">
          Permanently delete all saved quotes and history. This cannot be undone.
        </p>
        <div className="settings-actions">
          <button className="btn-small btn-danger-sm" onClick={onClearHistory}>
            Clear All History
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
