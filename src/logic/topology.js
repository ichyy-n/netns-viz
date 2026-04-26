import { NS_W, NS_W_SWITCH, NS_HEADER, NS_ITEM_H, NS_FOOTER } from "../theme.js";

function inferRole(ns, bridges, veths, ipForwardMap) {
  if (bridges.some(b => b.nsId === ns.id)) return 'switch';
  let ifCount = 0;
  veths.forEach(v => { if (v.endA.nsId === ns.id) ifCount++; if (v.endB.nsId === ns.id) ifCount++; });
  if (ifCount >= 2 && ipForwardMap?.[ns.id]) return 'router';
  return 'host';
}

export function getNsWidth() {
  return NS_W;
}

export function getNsHeight(ns, bridges, veths, vlans = []) {
  let items = 0;
  const usedVlanIds = new Set();
  bridges.filter(b => b.nsId === ns.id).forEach(b => {
    items++;
    const sviCount = (vlans || []).filter(vl => vl.nsId === ns.id && (vl.parentIface === b.name || vl.name.startsWith(b.name + '.'))).length;
    if (sviCount > 0) {
      items += 1 + sviCount; // svi-header + svi items
      (vlans || []).filter(vl => vl.nsId === ns.id && (vl.parentIface === b.name || vl.name.startsWith(b.name + '.'))).forEach(vl => usedVlanIds.add(vl.id));
    }
  });
  veths.forEach(v => { if (v.endA.nsId === ns.id) items++; if (v.endB.nsId === ns.id) items++; });
  vlans.filter(vl => vl.nsId === ns.id && !usedVlanIds.has(vl.id)).forEach(() => items++);
  return NS_HEADER + Math.max(items, 1) * NS_ITEM_H + NS_FOOTER;
}

export function getInterfacePositions(namespaces, bridges, veths, vlans = [], ipForwardMap = {}) {
  const pos = {};
  namespaces.forEach(ns => {
    const w = getNsWidth(ns, bridges, veths, ipForwardMap);
    let idx = 0;
    const nsBr = bridges.filter(b => b.nsId === ns.id);
    const usedVethEnds = new Set();
    const usedVlanIds = new Set();
    nsBr.forEach(b => {
      pos[b.id] = { x: ns.x + w, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: "right" }; idx++;
      veths.forEach(v => {
        const sideA = v.swapped ? "left" : "right";
        const sideB = v.swapped ? "right" : "left";
        if (v.endA.nsId === ns.id && v.endA.bridge === b.id) {
          pos[v.endA.id] = { x: sideA === "right" ? ns.x + w : ns.x, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: sideA }; idx++;
          usedVethEnds.add(`${v.id}_endA`);
        }
        if (v.endB.nsId === ns.id && v.endB.bridge === b.id) {
          pos[v.endB.id] = { x: sideB === "left" ? ns.x : ns.x + w, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: sideB }; idx++;
          usedVethEnds.add(`${v.id}_endB`);
        }
      });
      // SVI header + SVI items
      const sviList = (vlans || []).filter(vl => vl.nsId === ns.id && (vl.parentIface === b.name || vl.name.startsWith(b.name + '.')));
      if (sviList.length > 0) {
        idx++; // svi-header row
        sviList.forEach(vl => {
          pos[vl.id] = { x: ns.x + w, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: "right" }; idx++;
          usedVlanIds.add(vl.id);
        });
      }
    });
    veths.forEach(v => {
      const sideA = v.swapped ? "left" : "right";
      const sideB = v.swapped ? "right" : "left";
      if (v.endA.nsId === ns.id && !usedVethEnds.has(`${v.id}_endA`)) { pos[v.endA.id] = { x: sideA === "right" ? ns.x + w : ns.x, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: sideA }; idx++; }
      if (v.endB.nsId === ns.id && !usedVethEnds.has(`${v.id}_endB`)) { pos[v.endB.id] = { x: sideB === "left" ? ns.x : ns.x + w, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: sideB }; idx++; }
    });
    vlans.filter(vl => vl.nsId === ns.id && !usedVlanIds.has(vl.id)).forEach(vl => {
      pos[vl.id] = { x: ns.x + w, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: "right" }; idx++;
    });
  });
  return pos;
}
