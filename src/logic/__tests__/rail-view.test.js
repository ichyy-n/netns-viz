import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  buildRailView,
  autoLayout,
  buildLinkGeometry,
} from '../rail-view.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.resolve(__dirname, '../../../samples/ch01_vlan.json');
const ch01 = JSON.parse(readFileSync(samplePath, 'utf8'));

describe('buildRailView (ch01_vlan)', () => {
  const view = buildRailView(ch01);

  it('pc1, pc2 が VLAN10 に属する', () => {
    const pc1 = view.nsById['ch01-ns-pc1'];
    const pc2 = view.nsById['ch01-ns-pc2'];
    expect(pc1.role).toBe('host');
    expect(pc1.vlan).toBe(10);
    expect(pc2.role).toBe('host');
    expect(pc2.vlan).toBe(10);
  });

  it('pc3, pc4 が VLAN20 に属する', () => {
    const pc3 = view.nsById['ch01-ns-pc3'];
    const pc4 = view.nsById['ch01-ns-pc4'];
    expect(pc3.role).toBe('host');
    expect(pc3.vlan).toBe(20);
    expect(pc4.role).toBe('host');
    expect(pc4.vlan).toBe(20);
  });

  it('nsById に全 ns の id が存在する', () => {
    const expected = [
      'ch01-ns-sw1',
      'ch01-ns-sw2',
      'ch01-ns-pc1',
      'ch01-ns-pc2',
      'ch01-ns-pc3',
      'ch01-ns-pc4',
    ];
    for (const id of expected) {
      expect(view.nsById[id]).toBeDefined();
    }
  });
});

describe('autoLayout', () => {
  const view = buildRailView(ch01);

  it('x=undefined の ns に座標が付与される', () => {
    const mutated = view.namespaces.map((n) =>
      n.id === 'ch01-ns-pc1' || n.id === 'ch01-ns-sw1'
        ? { ...n, x: undefined, y: undefined }
        : n,
    );
    const result = autoLayout(mutated);
    expect(result['ch01-ns-sw1']).toBeDefined();
    expect(typeof result['ch01-ns-sw1'].x).toBe('number');
    expect(typeof result['ch01-ns-sw1'].y).toBe('number');
    expect(result['ch01-ns-pc1']).toBeDefined();
    expect(typeof result['ch01-ns-pc1'].x).toBe('number');
    expect(typeof result['ch01-ns-pc1'].y).toBe('number');
  });

  it('x=0 は保全され autoLayout で上書きされない', () => {
    const mutated = view.namespaces.map((n) =>
      n.id === 'ch01-ns-pc1' ? { ...n, x: 0, y: 0 } : n,
    );
    const result = autoLayout(mutated);
    expect(result['ch01-ns-pc1']).toBeUndefined();
  });

  it('既存座標を持つ ns は戻り値に含まれない', () => {
    const result = autoLayout(view.namespaces);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('buildLinkGeometry', () => {
  const view = buildRailView(ch01);

  it('全 link の d 属性に "C" が含まれる (ベジェ)', () => {
    const geo = buildLinkGeometry(view);
    expect(geo.length).toBeGreaterThan(0);
    for (const g of geo) {
      expect(g.d).toContain('C');
    }
  });

  it('trunk link に stroke-dasharray="5 4" が付与される', () => {
    const geo = buildLinkGeometry(view);
    const trunk = geo.find((g) => g.kind === 'trunk');
    expect(trunk).toBeDefined();
    expect(trunk.strokeDasharray).toBe('5 4');
  });

  it('access link には stroke-dasharray が付与されない', () => {
    const geo = buildLinkGeometry(view);
    const access = geo.filter((g) => g.kind === 'access');
    expect(access.length).toBeGreaterThan(0);
    for (const a of access) {
      expect(a.strokeDasharray).toBeNull();
    }
  });
});
