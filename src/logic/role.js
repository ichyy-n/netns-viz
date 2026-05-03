// inferRole: switch=bridges有, router=IF>=2&&ipForward, else=host
export function inferRole(ns) {
  if (ns.bridges && ns.bridges.length > 0) return 'switch';
  if (ns.interfaces.length >= 2 && (ns.ipForward || hasStaticRoute(ns))) return 'router';
  return 'host';
}

// Phase B スタブ: Phase C で routing 情報が入ったら実装
export function hasStaticRoute() {
  return false;
}
