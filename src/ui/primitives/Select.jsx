import { COLORS } from "../../theme.js";

export const Select = ({ label, value, onChange, options }) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <span style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
        color: COLORS.text, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, outline: "none", boxSizing: "border-box", appearance: "auto" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);
