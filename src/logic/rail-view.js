// Rail view model builder (rev2: IF-array based)
// buildRailView(state) → { namespaces: nsView[], links: linksView[], ... }
//
// nsView[i] = { id, name, role, interfaces:[{name,mac,ips[],state,peer?,vlan?,mode?,master?}],
//               bridges, ipForward, routing?, arp?, macTable?, x, y, ... }
// linksView[i] = { id, a:{ns,iface,nsId,port}, b:{ns,iface,nsId,port}, kind, vlan, vlans }
//   NOTE: nsId/port aliases preserved for Phase A UI (LeftRail, Inspector) backward compatibility.

import { enrichNamespaces } from './enrich.js';

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

  // bridgeVlans lookup: (nsId, portName) → [bv, ...]
  const bvFor = (nsId, portName) =>
    bridgeVlans.filter(bv => bv.nsId === nsId && bv.dev === portName);

  // Quick ns name lookup for peer label
  const nsNameById = Object.fromEntries(namespaces.map(ns => [ns.id, ns.name]));

  // Build interfaces per ns from veths
  const ifacesByNs = new Map(namespaces.map(ns => [ns.id, []]));

  for (const v of veths) {
    for (const [endKey, otherKey] of [['endA', 'endB'], ['endB', 'endA']]) {
      const end = v[endKey];
      const otherEnd = v[otherKey];
      if (!ifacesByNs.has(end.nsId)) continue;

      const bvs = bvFor(end.nsId, end.name);
      let vlan;
      let mode;
      if (bvs.length > 0) {
        const accessBv = bvs.find(bv => bv.pvid && bv.untagged);
        if (accessBv) {
          vlan = accessBv.vid;
          mode = 'access';
        } else {
          mode = 'trunk';
        }
      }

      let master;
      if (end.bridge) {
        const br = bridges.find(b => b.id === end.bridge);
        if (br) master = br.name;
      }

      const otherNsName = nsNameById[otherEnd.nsId];
      const peer = otherNsName != null ? `${otherEnd.name}@${otherNsName}` : undefined;

      const iface = {
        name: end.name,
        mac: end.mac || '',
        ips: end.ip ? [end.ip] : [],
        state: end.state || 'UP',
      };
      if (peer !== undefined) iface.peer = peer;
      if (vlan !== undefined) iface.vlan = vlan;
      if (mode !== undefined) iface.mode = mode;
      if (master !== undefined) iface.master = master;

      ifacesByNs.get(end.nsId).push(iface);
    }
  }

  // Build ns objects with interfaces + bridges, then enrich
  const nsWithInterfaces = namespaces.map(ns => ({
    ...ns,
    interfaces: ifacesByNs.get(ns.id) || [],
    bridges: bridgesByNs.get(ns.id) || [],
  }));

  const nsView = enrichNamespaces(nsWithInterfaces, state);

  // Compute legacy vlan field for Phase A Inspector backward compat (host VLAN from access port)
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
  for (const ns of nsView) {
    if (ns.role !== 'switch') ns.vlan = hostVlanByNs.get(ns.id) ?? null;
  }

  // Build links view: new format {ns,iface} + legacy aliases {nsId,port}
  const linksView = veths.map(v => {
    const bvA = bvFor(v.endA.nsId, v.endA.name);
    const bvB = bvFor(v.endB.nsId, v.endB.name);
    const allBvs = [...bvA, ...bvB];
    let kind = 'access';
    let vlan = null;
    let vlansOut = null;
    if (allBvs.length > 0) {
      if (
        allBvs.every(bv => bv.pvid && bv.untagged) &&
        new Set(allBvs.map(bv => bv.vid)).size === 1
      ) {
        kind = 'access';
        vlan = allBvs[0].vid;
      } else {
        kind = 'trunk';
        vlansOut = [...new Set(allBvs.map(bv => bv.vid))].sort((a, b) => a - b);
      }
    }
    return {
      id: v.id,
      a: { ns: v.endA.nsId, iface: v.endA.name, nsId: v.endA.nsId, port: v.endA.name },
      b: { ns: v.endB.nsId, iface: v.endB.name, nsId: v.endB.nsId, port: v.endB.name },
      kind,
      vlan,
      vlans: vlansOut,
    };
  });

  // VLAN ID set
  const vlanIds = [...new Set([
    ...bridgeVlans.map(bv => bv.vid),
    ...vlans.map(v => v.vlanId || v.vid),
  ])].filter(Boolean).sort((a, b) => a - b);

  const nsById = Object.fromEntries(nsView.map(n => [n.id, n]));

  return {
    namespaces: nsView,
    bridges,
    veths,
    bridgeVlans,
    links: linksView,
    vlanIds,
    switches: nsView.filter(n => n.role === 'switch'),
    routers: nsView.filter(n => n.role === 'router'),
    hosts: nsView.filter(n => n.role === 'host'),
    nsById,
  };
}
