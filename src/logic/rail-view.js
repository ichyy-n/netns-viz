// Rail view model builder
// 実 state ({ namespaces, bridges, veths, vlans, bridgeVlans, ... }) から
// Rail UI (LeftRail / Inspector / CommandPalette) が必要とする view model を作る純粋関数。
// React 非依存。
//
// bridgeVlans 実データ形状: { nsId, dev (port名), vid, pvid, untagged, devType: 'port' }
// veths 実データ形状: { id, endA: { name, nsId, bridge, ip, ... }, endB: { ... } }

export function buildRailView(state) {
  const {
    namespaces = [],
    bridges = [],
    veths = [],
    vlans = [],
    bridgeVlans = [],
  } = state || {};

  // Index: bridges by nsId
  const bridgesByNs = new Map();
  for (const b of bridges) {
    if (!bridgesByNs.has(b.nsId)) bridgesByNs.set(b.nsId, []);
    bridgesByNs.get(b.nsId).push(b);
  }

  // Helper: bridgeVlans for (nsId, portName)
  const bvFor = (nsId, portName) =>
    bridgeVlans.filter(bv => bv.nsId === nsId && bv.dev === portName);

  // Precompute host 代表 VLAN: host 側 veth end について、対向 switch 側ポートの
  // pvid+untagged な bridgeVlans エントリの vid を拾う
  const hostVlanByNs = new Map();
  for (const v of veths) {
    for (const end of ['endA', 'endB']) {
      const hostEnd = v[end];
      const otherEnd = v[end === 'endA' ? 'endB' : 'endA'];
      if (bridgesByNs.has(hostEnd.nsId)) continue;
      const bvs = bvFor(otherEnd.nsId, otherEnd.name);
      const access = bvs.find(bv => bv.pvid && bv.untagged);
      if (access && !hostVlanByNs.has(hostEnd.nsId)) {
        hostVlanByNs.set(hostEnd.nsId, access.vid);
      }
    }
  }

  // ns view: + role ('switch' | 'host') + vlan + bridges
  const nsView = namespaces.map(ns => {
    const nsBridges = bridgesByNs.get(ns.id) || [];
    const role = nsBridges.length > 0 ? 'switch' : 'host';
    const vlan = role === 'host' ? (hostVlanByNs.get(ns.id) ?? null) : null;
    return { ...ns, role, vlan, bridges: nsBridges };
  });

  // links: veth → { id, a, b, kind, vlan, vlans }
  const linksView = veths.map(v => {
    const bvA = bvFor(v.endA.nsId, v.endA.name);
    const bvB = bvFor(v.endB.nsId, v.endB.name);
    const allBvs = [...bvA, ...bvB];
    let kind = 'access';
    let vlan = null;
    let vlansOut = null;
    if (allBvs.length === 0) {
      kind = 'access';
    } else if (
      allBvs.every(bv => bv.pvid && bv.untagged) &&
      new Set(allBvs.map(bv => bv.vid)).size === 1
    ) {
      kind = 'access';
      vlan = allBvs[0].vid;
    } else {
      kind = 'trunk';
      vlansOut = [...new Set(allBvs.map(bv => bv.vid))].sort((a, b) => a - b);
    }
    return {
      id: v.id,
      a: { nsId: v.endA.nsId, port: v.endA.name },
      b: { nsId: v.endB.nsId, port: v.endB.name },
      kind,
      vlan,
      vlans: vlansOut,
    };
  });

  // VLAN ID 集合: bridgeVlans + state.vlans 由来
  const vlanIds = [...new Set([
    ...bridgeVlans.map(bv => bv.vid),
    ...vlans.map(v => v.vlanId || v.vid),
  ])].filter(Boolean).sort((a, b) => a - b);

  // nsById: Inspector O(1) 参照用
  const nsById = Object.fromEntries(nsView.map(n => [n.id, n]));

  return {
    namespaces: nsView,
    bridges,
    veths,
    bridgeVlans,
    links: linksView,
    vlanIds,
    switches: nsView.filter(n => n.role === 'switch'),
    hosts: nsView.filter(n => n.role === 'host'),
    nsById,
  };
}
