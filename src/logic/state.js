import { enrichBridgeVlans } from "./enrich.js";

export const GUI_STATE_KEY = "netns-viz:gui-state:v1";

export const defaultState = () => ({ namespaces: [], bridges: [], veths: [], vlans: [], bridgeVlans: [], routes: [], commands: [] });

export const loadGuiState = () => {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.sessionStorage.getItem(GUI_STATE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultState();
    if (!Array.isArray(parsed.namespaces) || !Array.isArray(parsed.bridges) || !Array.isArray(parsed.veths) || !Array.isArray(parsed.routes)) {
      return defaultState();
    }
    if (!Array.isArray(parsed.commands)) parsed.commands = [];
    if (!Array.isArray(parsed.vlans)) parsed.vlans = [];
    if (!Array.isArray(parsed.bridgeVlans)) parsed.bridgeVlans = [];
    enrichBridgeVlans(parsed.bridgeVlans, parsed.veths, parsed.bridges);
    return parsed;
  } catch {
    return defaultState();
  }
};

export const saveGuiState = (state) => {
  try {
    window.sessionStorage.setItem(GUI_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
};
