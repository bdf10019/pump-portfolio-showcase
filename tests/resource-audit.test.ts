import {describe,it,expect} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Texture} from 'three';
import {createResourceAudit} from '../src/resource-audit';

describe('W5 owned-resource disposal audit',()=>{
 it('deduplicates shared materials/textures and repeated dispose events',()=>{
  const geometry=new BoxGeometry(),texture=new Texture(),material=new MeshStandardMaterial({roughnessMap:texture});
  const group=new Group();group.add(new Mesh(geometry,material),new Mesh(geometry,material));
  const audit=createResourceAudit();audit.scene(group);audit.material(material);
  geometry.dispose();material.dispose();material.dispose();texture.dispose();
  expect(audit.finish()).toEqual({tracked:3,released:3,remaining:0});
 });
 it('reports an unreferenced material that was not released',()=>{
  const audit=createResourceAudit(),material=new MeshStandardMaterial();audit.material(material);
  expect(audit.finish()).toEqual({tracked:1,released:0,remaining:1});material.dispose();
 });
});
