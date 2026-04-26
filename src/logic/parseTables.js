// Parse `ip route show` output into structured rows
// Examples:
//   default via 192.168.1.1 dev eth0 proto static
//   192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
//   10.0.0.0/8 via 192.168.1.254 dev eth0 proto static metric 100
export function parseRoutes(raw) {
  if (!raw) return [];
  return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const tokens = line.split(/\s+/);
    const dst = tokens[0];
    const get = (key) => {
      const i = tokens.indexOf(key);
      return i >= 0 ? tokens[i + 1] : null;
    };
    return {
      dst,
      via: get('via'),
      dev: get('dev'),
      proto: get('proto'),
    };
  });
}

// Parse `ip neigh show` output
// Examples:
//   192.168.1.1 dev eth0 lladdr 00:11:22:33:44:55 REACHABLE
//   192.168.1.2 dev eth0 FAILED
export function parseArp(raw) {
  if (!raw) return [];
  return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const tokens = line.split(/\s+/);
    const ip = tokens[0];
    const get = (key) => {
      const i = tokens.indexOf(key);
      return i >= 0 ? tokens[i + 1] : null;
    };
    const states = ['REACHABLE', 'STALE', 'DELAY', 'PROBE', 'FAILED', 'INCOMPLETE', 'PERMANENT', 'NOARP'];
    const state = tokens.find(t => states.includes(t)) || null;
    return {
      ip,
      dev: get('dev'),
      mac: get('lladdr'),
      state,
    };
  });
}

// Parse `bridge fdb show br <bridge>` output
// Examples:
//   aa:bb:cc:dd:ee:ff dev veth1 master br0 permanent
//   00:11:22:33:44:55 dev veth2 vlan 10 master br0
export function parseFdb(raw) {
  if (!raw) return [];
  return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const tokens = line.split(/\s+/);
    const mac = tokens[0];
    const get = (key) => {
      const i = tokens.indexOf(key);
      return i >= 0 ? tokens[i + 1] : null;
    };
    const flags = [];
    if (tokens.includes('permanent')) flags.push('permanent');
    if (tokens.includes('static')) flags.push('static');
    if (tokens.includes('self')) flags.push('self');
    if (tokens.includes('master')) flags.push('master');
    return {
      mac,
      dev: get('dev'),
      vlan: get('vlan'),
      flags: flags.join(' '),
    };
  });
}
