import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { buildRailView } from '../rail-view.js';

const require = createRequire(import.meta.url);
const ch02 = require('../../../samples/ch02_routing.json');
const ch01 = require('../../../samples/ch01_vlan.json');

describe('buildRailView — ch02_routing (router topology)', () => {
  const rv = buildRailView(ch02);

  it('produces nsView for all 3 namespaces', () => {
    expect(rv.namespaces).toHaveLength(3);
  });

  it('router ns has interfaces.length >= 2', () => {
    const router = rv.namespaces.find(n => n.name === 'router');
    expect(router).toBeDefined();
    expect(router.interfaces.length).toBeGreaterThanOrEqual(2);
  });

  it('router role is "router"', () => {
    const router = rv.namespaces.find(n => n.name === 'router');
    expect(router.role).toBe('router');
  });

  it('pc1/pc2 role is "host"', () => {
    const pc1 = rv.namespaces.find(n => n.name === 'pc1');
    const pc2 = rv.namespaces.find(n => n.name === 'pc2');
    expect(pc1.role).toBe('host');
    expect(pc2.role).toBe('host');
  });

  it('router has ipForward=true', () => {
    const router = rv.namespaces.find(n => n.name === 'router');
    expect(router.ipForward).toBe(true);
  });

  it('router has routing data attached', () => {
    const router = rv.namespaces.find(n => n.name === 'router');
    expect(Array.isArray(router.routing)).toBe(true);
    expect(router.routing.length).toBeGreaterThan(0);
  });

  it('links have both new (ns/iface) and legacy (nsId/port) fields', () => {
    const link = rv.links[0];
    expect(link.a.ns).toBeDefined();
    expect(link.a.iface).toBeDefined();
    expect(link.a.nsId).toBeDefined();
    expect(link.a.port).toBeDefined();
  });
});

describe('buildRailView — ch01_vlan (switch topology)', () => {
  const rv = buildRailView(ch01);

  it('produces nsView for all 6 namespaces', () => {
    expect(rv.namespaces).toHaveLength(6);
  });

  it('sw1 has bridges.length >= 1', () => {
    const sw1 = rv.namespaces.find(n => n.name === 'sw1');
    expect(sw1).toBeDefined();
    expect(sw1.bridges.length).toBeGreaterThanOrEqual(1);
  });

  it('sw1/sw2 role is "switch"', () => {
    const sw1 = rv.namespaces.find(n => n.name === 'sw1');
    const sw2 = rv.namespaces.find(n => n.name === 'sw2');
    expect(sw1.role).toBe('switch');
    expect(sw2.role).toBe('switch');
  });

  it('host namespaces have interfaces', () => {
    const pc1 = rv.namespaces.find(n => n.name === 'pc1');
    expect(pc1).toBeDefined();
    expect(pc1.interfaces.length).toBeGreaterThan(0);
  });

  it('sw1 has macTable data attached', () => {
    const sw1 = rv.namespaces.find(n => n.name === 'sw1');
    expect(Array.isArray(sw1.macTable)).toBe(true);
    expect(sw1.macTable.length).toBeGreaterThan(0);
  });

  it('vlanIds includes vlan 10 and 20', () => {
    expect(rv.vlanIds).toContain(10);
    expect(rv.vlanIds).toContain(20);
  });
});
