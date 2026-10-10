import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createPumpModel, type PumpContract } from '../src/pump-detailed';

const contract = JSON.parse(readFileSync('public/assets/pump-core-v1/pump-core-parts-v1.json', 'utf8')) as PumpContract;
describe('精細重製模型', () => {
  it('保持十一個節點且選取不破壞軸系位置，拆解可完全復原', () => {
    const model = createPumpModel(contract);
    expect([...model.parts.keys()]).toEqual(contract.parts.map(p => p.id));
    model.selectPart('impeller');
    model.parts.forEach(part => expect(part.scale.toArray()).toEqual([1, 1, 1]));
    model.setExplode(1);
    contract.parts.forEach(p => expect(model.parts.get(p.id)!.position.toArray()).toEqual(p.explode));
    model.setExplode(0);
    model.parts.forEach(part => expect(part.position.toArray()).toEqual([0, 0, 0]));
    model.dispose();
  });
  it('軸承中心有實際通孔，可供主軸穿過', () => {
    const model = createPumpModel(contract);
    model.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-2, 1.08, 0), new THREE.Vector3(1, 0, 0));
    expect(ray.intersectObject(model.parts.get('bearing_front')!, true)).toHaveLength(0);
    ray.set(new THREE.Vector3(-2, 1.08 + .26, 0), new THREE.Vector3(1, 0, 0));
    expect(ray.intersectObject(model.parts.get('bearing_front')!, true).length).toBeGreaterThan(0);
    model.dispose();
  });
  it('手機幾何較少，所有位置與法線有限且可匯出', () => {
    const counts: number[] = [];
    for (const quality of ['desktop', 'mobile'] as const) {
      const model = createPumpModel(contract, quality);
      let triangles = 0;
      model.root.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const g = child.geometry;
        for (const name of ['position', 'normal', 'color']) expect(Array.from(g.getAttribute(name).array).every(Number.isFinite)).toBe(true);
        triangles += (g.index?.count ?? g.getAttribute('position').count) / 3;
      });
      counts.push(triangles); model.dispose();
    }
    expect(counts[1]).toBeLessThan(counts[0]);
  });
  it('新版 GLB 包含全部具名零件與 PBR 材質', () => {
    const glb = readFileSync('public/assets/pump-core-v1/pump-core-detailed-v2.glb');
    expect(glb.subarray(0, 4).toString()).toBe('glTF');
    expect(glb.readUInt32LE(8)).toBe(glb.length);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
    const names = json.nodes.map((n: { name: string }) => n.name);
    contract.parts.forEach(part => expect(names).toContain(part.id));
    expect(json.materials.every((m: { pbrMetallicRoughness: unknown }) => m.pbrMetallicRoughness)).toBe(true);
  });
});
