import { useState } from "react";
import { buildCustomTheme, type CustomTheme, type ThemeColorSet } from "../utils/customTheme";

function ThemePreview({ colors }: { colors: ThemeColorSet }) {
  return (
    <div className="cte-preview">
      <span className="cte-preview-label">Preview</span>
      <div className="cte-preview-items">
        <button
          type="button"
          className="cte-preview-btn"
          style={{
            background: colors.accent,
            color: colors.accentText,
            boxShadow: `0 0 0 3px ${colors.accentRing}`,
          }}
        >
          Save Quote
        </button>
        <span
          className="cte-preview-badge"
          style={{ color: colors.accent, background: colors.accentRing }}
        >
          Brakes
        </span>
      </div>
    </div>
  );
}

function CustomThemeEditor({
  isDark,
  existing,
  onSave,
  onCancel,
}: {
  isDark: boolean;
  existing: CustomTheme | null;
  onSave: (theme: CustomTheme) => void;
  onCancel: () => void;
}) {
  const [lightAccent, setLightAccent] = useState(existing?.light.accent ?? "#7c3aed");
  const [darkAccent, setDarkAccent] = useState(existing?.dark.accent ?? "#7c3aed");

  const theme = buildCustomTheme(lightAccent, darkAccent);
  const previewColors = isDark ? theme.dark : theme.light;

  return (
    <div className="cte-container">
      <h4 className="cte-title">Custom Theme</h4>

      <div className="cte-fields">
        <div className="cte-field">
          <label className="cte-field-label">Light Mode Color</label>
          <div className="cte-color-row">
            <input
              aria-label="Light Mode Accent Color"
              type="color"
              className="cte-color-input"
              value={lightAccent}
              onChange={(e) => setLightAccent(e.target.value)}
            />
            <input
              aria-label="Light Mode Accent Color Hex Code"
              type="text"
              className="cte-hex-input"
              value={lightAccent}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setLightAccent(v);
              }}
            />
          </div>
        </div>

        <div className="cte-field">
          <label className="cte-field-label">Dark Mode Color</label>
          <div className="cte-color-row">
            <input
              aria-label="Dark Mode Accent Color"
              type="color"
              className="cte-color-input"
              value={darkAccent}
              onChange={(e) => setDarkAccent(e.target.value)}
            />
            <input
              aria-label="Dark Mode Accent Color Hex Code"
              type="text"
              className="cte-hex-input"
              value={darkAccent}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setDarkAccent(v);
              }}
            />
          </div>
        </div>
      </div>

      <ThemePreview colors={previewColors} />

      <div className="cte-actions">
        <button
          type="button"
          className="btn btn-success btn-small"
          onClick={() => onSave(theme)}
        >
          Save Theme
        </button>
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CustomThemeEditor;
