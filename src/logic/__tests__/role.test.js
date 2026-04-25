import { describe, it, expect } from 'vitest';
import { inferRole, hasStaticRoute } from '../role.js';

describe('inferRole', () => {
  it('returns switch when ns has bridges', () => {
    const ns = { bridges: [{ id: 'br0', name: 'br0' }], interfaces: [], ipForward: false };
    expect(inferRole(ns)).toBe('switch');
  });

  it('returns router when IF >= 2 and ipForward=true', () => {
    const ns = { bridges: [], interfaces: [{ name: 'eth0' }, { name: 'eth1' }], ipForward: true };
    expect(inferRole(ns)).toBe('router');
  });

  it('returns host when IF=1 and ipForward=false', () => {
    const ns = { bridges: [], interfaces: [{ name: 'eth0' }], ipForward: false };
    expect(inferRole(ns)).toBe('host');
  });

  it('returns host when IF=0', () => {
    const ns = { bridges: [], interfaces: [], ipForward: false };
    expect(inferRole(ns)).toBe('host');
  });

  it('returns host when IF >= 2 but ipForward=false', () => {
    const ns = { bridges: [], interfaces: [{ name: 'eth0' }, { name: 'eth1' }], ipForward: false };
    expect(inferRole(ns)).toBe('host');
  });
});

describe('hasStaticRoute', () => {
  it('always returns false (Phase B stub)', () => {
    expect(hasStaticRoute({ routing: [{ proto: 'static' }] })).toBe(false);
    expect(hasStaticRoute({})).toBe(false);
  });
});
