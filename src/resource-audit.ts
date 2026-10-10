import { Material, Mesh, Points, Texture, type Object3D } from 'three';

// Observe disposal events, not process/GPU memory. Also tracks resources that were never uploaded.
export function createResourceAudit() {
 const resources = new Set<{ addEventListener: Function; removeEventListener: Function }>();
 const released = new Set<object>();
 const listeners = new Map<object, () => void>();
 function track(resource: { addEventListener: Function; removeEventListener: Function } | null | undefined) {
  if (!resource || resources.has(resource)) return;
  resources.add(resource);
  const listener = () => released.add(resource);
  listeners.set(resource, listener);
  resource.addEventListener('dispose', listener);
 }
 function material(value: Material) {
  track(value);
  for (const property of Object.values(value)) if (property instanceof Texture) track(property);
 }
 function scene(root: Object3D) {
  root.traverse(object => {
   if (!(object instanceof Mesh || object instanceof Points)) return;
   track(object.geometry);
   (Array.isArray(object.material) ? object.material : [object.material]).forEach(material);
  });
 }
 function finish() {
  const report = { tracked: resources.size, released: released.size, remaining: resources.size - released.size };
  for (const resource of resources) resource.removeEventListener('dispose', listeners.get(resource)!);
  resources.clear(); released.clear(); listeners.clear();
  return report;
 }
 return { track, material, scene, finish };
}
