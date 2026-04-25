import { inferRole } from './role.js';

// Enrich bridgeVlans entries with vethId/vethEnd/bridgeId if missing (older save format compatibility)
export const enrichBridgeVlans = (bridgeVlans, veths, bridges = []) => {
  for (const bv of bridgeVlans) {
    if (!bv.vethId || !bv.vethEnd) {
      for (const v of veths) {
        for (const end of ['endA', 'endB']) {
          if (v[end].name === bv.dev && v[end].nsId === bv.nsId) {
            bv.vethId = v.id;
            bv.vethEnd = end;
            if (!bv.bridgeId && v[end].bridge) bv.bridgeId = v[end].bridge;
            break;
          }
        }
        if (bv.vethId) break;
      }
    }
    if (!bv.bridgeId) {
      // Fallback: find bridge in the same namespace
      const br = bridges.find(b => b.nsId === bv.nsId);
      if (br) bv.bridgeId = br.id;
    }
  }
};

// Enrich ns objects (which already have .interfaces and .bridges) with:
// role (via inferRole), ipForward (from ipForwardMap), and routing/arp/macTable keyed by ns.name.
export function enrichNamespaces(nsWithInterfaces, state) {
  const { ipForwardMap = {}, routing = {}, arp = {}, macTable = {} } = state || {};
  return nsWithInterfaces.map(ns => {
    const ipForward = !!ipForwardMap[ns.id];
    const enriched = { ...ns, ipForward };
    const nsRouting = routing[ns.name];
    const nsArp = arp[ns.name];
    const nsMacTable = macTable[ns.name];
    if (nsRouting !== undefined) enriched.routing = nsRouting;
    if (nsArp !== undefined) enriched.arp = nsArp;
    if (nsMacTable !== undefined) enriched.macTable = nsMacTable;
    enriched.role = inferRole(enriched);
    return enriched;
  });
}
