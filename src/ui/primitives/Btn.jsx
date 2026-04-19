import { useState } from "react";
import { COLORS } from "../../theme.js";

export const Btn = ({ children, onClick, color = COLORS.accent, small, ghost, disabled, style, ...props }) => {
  const [hover, setHover] = useState(false);
  const bg = ghost ? "transparent" : color;
  const hoverBg = ghost ? "rgba(255,255,255,0.05)" : color + "dd";
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: small ? "4px 10px" : "7px 14px",
        fontSize: small ? 11 : 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
        color: ghost ? COLORS.textMuted : "#fff", background: hover && !disabled ? hoverBg : bg,
        border: ghost ? `1px solid ${COLORS.border}` : "none", borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s", letterSpacing: "0.02em", ...style }} {...props}>{children}</button>
  );
};
