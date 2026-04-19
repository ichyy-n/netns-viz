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
