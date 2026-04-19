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

// Phase B layout constants (Rail 基準)
const NS_W = 200;
const NS_H_SWITCH = 110;
const NS_H_HOST = 94;
const Y_SWITCH = 120;
const Y_HOST = 420;

// autoLayout: x/y 未定義 ns のみ座標を算出。x=0 は有効座標として保全。
// 発動: 初回レンダ時 + 新規 ns 追加時（呼び出し側が制御）。
// 戻り値: { [nsId]: { x, y } } — 未定義 ns のみを含む
export function autoLayout(namespaces, width = 1200, height = 800) {
  void height;
  const result = {};
  const list = namespaces || [];
  const switches = list.filter(n => n.role === 'switch');
  const hosts = list.filter(n => n.role !== 'switch');

  const swCount = Math.max(1, switches.length);
  switches.forEach((sw, i) => {
    if (sw.x == null || sw.y == null) {
      const x = (i + 0.5) * (width / swCount) - NS_W / 2;
      result[sw.id] = { x, y: Y_SWITCH };
    }
  });

  const hostCount = Math.max(1, hosts.length);
  hosts.forEach((h, i) => {
    if (h.x == null || h.y == null) {
      const x = (i + 0.5) * (width / hostCount) - NS_W / 2;
      result[h.id] = { x, y: Y_HOST };
    }
  });

  return result;
}

// buildLinkGeometry: veth link のベジェ d 属性とメタ情報を生成
// 戻り値: [{ id, kind, vid, vids, a:{x,y}, b:{x,y}, d, strokeDasharray }]
export function buildLinkGeometry(railView) {
  const links = railView?.links || [];
  const nsById = railView?.nsById || {};
  const out = [];

  for (const l of links) {
    const nsA = nsById[l.a.nsId];
    const nsB = nsById[l.b.nsId];
    if (!nsA || !nsB) continue;
    if (nsA.x == null || nsA.y == null || nsB.x == null || nsB.y == null) continue;
    const hA = nsA.role === 'switch' ? NS_H_SWITCH : NS_H_HOST;
    const hB = nsB.role === 'switch' ? NS_H_SWITCH : NS_H_HOST;
    const ax = nsA.x + NS_W / 2;
    const ay = nsA.y + hA / 2;
    const bx = nsB.x + NS_W / 2;
    const by = nsB.y + hB / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.abs(dx) > Math.abs(dy)
      ? `M ${ax},${ay} C ${ax + dx * 0.4},${ay} ${bx - dx * 0.4},${by} ${bx},${by}`
      : `M ${ax},${ay} C ${ax},${ay + dy * 0.45} ${bx},${by - dy * 0.45} ${bx},${by}`;

    out.push({
      id: l.id,
      kind: l.kind,
      vid: l.vlan ?? null,
      vids: l.vlans ?? null,
      a: { x: ax, y: ay },
      b: { x: bx, y: by },
      d,
      strokeDasharray: l.kind === 'trunk' ? '5 4' : null,
    });
  }

  return out;
}
