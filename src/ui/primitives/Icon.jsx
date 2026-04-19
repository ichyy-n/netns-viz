import { COLORS } from "../../theme.js";

export const Icon = ({ d, size = 16, color = COLORS.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

// eslint-disable-next-line react-refresh/only-export-components
export const Icons = {
  plus: "M12 5v14M5 12h14",
  network: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  x: "M18 6L6 18M6 6l12 12",
  terminal: "M4 17l6-5-6-5M12 19h8",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
};
