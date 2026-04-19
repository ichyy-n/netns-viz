import { NS_W, NS_HEADER, NS_ITEM_H } from "../theme.js";

export function getNsHeight(ns, bridges, veths, vlans = []) {
  let items = 0;
  bridges.filter(b => b.nsId === ns.id).forEach(() => items++);
  veths.forEach(v => { if (v.endA.nsId === ns.id) items++; if (v.endB.nsId === ns.id) items++; });
  vlans.filter(vl => vl.nsId === ns.id).forEach(() => items++);
  return NS_HEADER + Math.max(items, 1) * NS_ITEM_H + 16;
}

export function getInterfacePositions(namespaces, bridges, veths, vlans = []) {
  const pos = {};
  namespaces.forEach(ns => {
    let idx = 0;
    bridges.filter(b => b.nsId === ns.id).forEach(b => {
      pos[b.id] = { x: ns.x + NS_W, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: "right" }; idx++;
    });
    veths.forEach(v => {
      const sideA = v.swapped ? "left" : "right";
      const sideB = v.swapped ? "right" : "left";
      if (v.endA.nsId === ns.id) { pos[v.endA.id] = { x: sideA === "right" ? ns.x + NS_W : ns.x, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: sideA }; idx++; }
      if (v.endB.nsId === ns.id) { pos[v.endB.id] = { x: sideB === "left" ? ns.x : ns.x + NS_W, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: sideB }; idx++; }
    });
    vlans.filter(vl => vl.nsId === ns.id).forEach(vl => {
      pos[vl.id] = { x: ns.x + NS_W, y: ns.y + NS_HEADER + idx * NS_ITEM_H + NS_ITEM_H / 2, side: "right" }; idx++;
    });
  });
  return pos;
}
