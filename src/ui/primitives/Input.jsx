import { COLORS } from "../../theme.js";

export const Input = ({ label, value, onChange, placeholder, mono }) => (
  <label style={{ display: "block", marginBottom: 12 }}>
    <span style={{ display: "block", fontSize: 11, color: COLORS.textMuted, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
        color: COLORS.text, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, outline: "none", boxSizing: "border-box" }} />
  </label>
);
