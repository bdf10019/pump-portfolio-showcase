import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type PartDefinition = {
  id: string;
  label: string;
  function: string;
  signal: string;
  truth: string;
  explode: [number, number, number];
};

export type PumpContract = {
  schemaVersion: string;
  assetId: string;
  subject: string;
  units: string;
  truthStatus: string;
  parts: PartDefinition[];
};

export type PumpModel = {
  root: THREE.Group;
  parts: Map<string, THREE.Group>;
  setExplode(progress: number): void;
  selectPart(id: string | null): void;
  dispose(): void;
};

type MaterialSet = ReturnType<typeof createMaterials>;

const COLOR = {
  paint: 0x263746,
  paintDark: 0x1e2a33,
  bronze: 0xa87339,
  steel: 0xb8c1c5,
  darkSteel: 0x565f64,
  rubber: 0x111820,
  ceramic: 0xd7d9d5,
  sensor: 0x9da8ad,
  amber: 0xf0a24a,
};

function createMaterials() {
  return {
    paint: new THREE.MeshStandardMaterial({ color: COLOR.paint, metalness: 0.14, roughness: 0.56 }),
    paintDark: new THREE.MeshStandardMaterial({ color: COLOR.paintDark, metalness: 0.18, roughness: 0.48 }),
    bronze: new THREE.MeshStandardMaterial({ color: COLOR.bronze, metalness: 0.74, roughness: 0.34 }),
    steel: new THREE.MeshStandardMaterial({ color: COLOR.steel, metalness: 0.9, roughness: 0.24 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: COLOR.darkSteel, metalness: 0.82, roughness: 0.38 }),
    rubber: new THREE.MeshStandardMaterial({ color: COLOR.rubber, metalness: 0.02, roughness: 0.78 }),
    ceramic: new THREE.MeshStandardMaterial({ color: COLOR.ceramic, metalness: 0.04, roughness: 0.3 }),
    sensor: new THREE.MeshStandardMaterial({ color: COLOR.sensor, metalness: 0.78, roughness: 0.28 }),
    amber: new THREE.MeshStandardMaterial({
      color: COLOR.amber,
      emissive: new THREE.Color(0x7c3f08),
      emissiveIntensity: 0.22,
      metalness: 0.2,
      roughness: 0.36,
    }),
    bolt: new THREE.MeshStandardMaterial({ color: 0x6d777c, metalness: 0.88, roughness: 0.32 }),
  };
}

function mesh<T extends THREE.BufferGeometry>(geometry: T, material: THREE.Material) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function cylinderX(radius: number, length: number, segments: number, material: THREE.Material) {
  const object = mesh(new THREE.CylinderGeometry(radius, radius, length, segments, 1, false), material);
  object.rotation.z = Math.PI / 2;
  return object;
}

function torusX(radius: number, tube: number, segments: number, material: THREE.Material) {
  const object = mesh(new THREE.TorusGeometry(radius, tube, Math.max(10, segments / 2), segments), material);
  object.rotation.y = Math.PI / 2;
  return object;
}

function bolt(materials: MaterialSet, x: number, y: number, z: number) {
  const object = cylinderX(0.045, 0.12, 16, materials.bolt);
  object.position.set(x, y, z);
  return object;
}

function decoratePart(group: THREE.Group, definition: PartDefinition) {
  group.name = definition.id;
  group.userData.partId = definition.id;
  group.userData.basePosition = [group.position.x, group.position.y, group.position.z];
  group.userData.explode = definition.explode;
  group.traverse((child) => {
    child.userData.partId = definition.id;
    child.userData.partLabel = definition.label;
  });
}

function consolidatePartMeshes(group: THREE.Group, castsShadow: boolean) {
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const sourceMeshes = group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);

  sourceMeshes.forEach((source) => {
    source.updateMatrix();
    const geometry = source.geometry.clone();
    geometry.applyMatrix4(source.matrix);
    const material = source.material as THREE.Material;
    const bucket = buckets.get(material) ?? [];
    bucket.push(geometry);
    buckets.set(material, bucket);
  });

  group.clear();
  buckets.forEach((geometries, material) => {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) throw new Error("Unable to consolidate pump geometry");
    const consolidated = mesh(geometry, material);
    consolidated.castShadow = castsShadow;
    group.add(consolidated);
    geometries.forEach((item) => item.dispose());
  });
  sourceMeshes.forEach((source) => source.geometry.dispose());
}

function createBaseplate(materials: MaterialSet) {
  const group = new THREE.Group();
  const plate = mesh(new THREE.BoxGeometry(4.3, 0.18, 1.65, 8, 2, 4), materials.paintDark);
  plate.position.set(0.25, 0.08, 0);
  group.add(plate);
  const railA = mesh(new THREE.BoxGeometry(3.85, 0.14, 0.22), materials.darkSteel);
  railA.position.set(0.35, 0.24, 0.56);
  const railB = railA.clone();
  railB.position.z = -0.56;
  group.add(railA, railB);
  [-1.55, 1.65].forEach((x) => {
    [-0.61, 0.61].forEach((z) => group.add(bolt(materials, x, 0.24, z)));
  });
  return group;
}

function createVolute(materials: MaterialSet, segments: number) {
  const group = new THREE.Group();
  const body = cylinderX(0.7, 0.48, segments, materials.paint);
  body.position.set(-1.02, 0.96, 0);
  group.add(body);
  const bodyRing = torusX(0.61, 0.13, segments, materials.paint);
  bodyRing.position.set(-1.26, 0.96, 0);
  group.add(bodyRing);
  const inlet = cylinderX(0.34, 0.62, segments, materials.paint);
  inlet.position.set(-1.48, 0.96, 0);
  group.add(inlet);
  const inletFlange = cylinderX(0.45, 0.12, segments, materials.paintDark);
  inletFlange.position.set(-1.8, 0.96, 0);
  group.add(inletFlange);
  const outlet = mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.72, segments), materials.paint);
  outlet.position.set(-0.95, 1.55, 0.02);
  group.add(outlet);
  const outletFlange = mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.12, segments), materials.paintDark);
  outletFlange.position.set(-0.95, 1.94, 0.02);
  group.add(outletFlange);
  const foot = mesh(new THREE.BoxGeometry(0.95, 0.24, 0.88), materials.paintDark);
  foot.position.set(-0.82, 0.35, 0);
  group.add(foot);
  return group;
}

function createImpeller(materials: MaterialSet, segments: number) {
  const group = new THREE.Group();
  const hub = cylinderX(0.19, 0.25, segments, materials.bronze);
  hub.position.set(-0.92, 0.96, 0);
  group.add(hub);
  const backplate = cylinderX(0.52, 0.08, segments, materials.bronze);
  backplate.position.set(-0.86, 0.96, 0);
  group.add(backplate);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const blade = mesh(new THREE.BoxGeometry(0.13, 0.34, 0.1, 2, 4, 2), materials.bronze);
    blade.position.set(-0.99, 0.96 + Math.cos(angle) * 0.29, Math.sin(angle) * 0.29);
    blade.rotation.x = angle + 0.5;
    blade.rotation.z = -0.18;
    group.add(blade);
  }
  return group;
}

function createShaft(materials: MaterialSet, segments: number) {
  const group = new THREE.Group();
  const shaft = cylinderX(0.095, 2.55, segments, materials.steel);
  shaft.position.set(0.02, 0.96, 0);
  group.add(shaft);
  const shoulder = cylinderX(0.15, 0.22, segments, materials.darkSteel);
  shoulder.position.set(-0.5, 0.96, 0);
  group.add(shoulder);
  return group;
}

function createBearing(materials: MaterialSet, segments: number, x: number) {
  const group = new THREE.Group();
  const outer = cylinderX(0.3, 0.27, segments, materials.darkSteel);
  outer.position.set(x, 0.96, 0);
  const face = torusX(0.23, 0.055, segments, materials.steel);
  face.position.set(x - 0.145, 0.96, 0);
  group.add(outer, face);
  return group;
}

function createSeal(materials: MaterialSet, segments: number) {
  const group = new THREE.Group();
  const rubber = cylinderX(0.23, 0.15, segments, materials.rubber);
  rubber.position.set(-0.55, 0.96, 0);
  const ceramic = torusX(0.16, 0.045, segments, materials.ceramic);
  ceramic.position.set(-0.64, 0.96, 0);
  group.add(rubber, ceramic);
  return group;
}

function createCoupling(materials: MaterialSet, segments: number) {
  const group = new THREE.Group();
  const left = cylinderX(0.24, 0.24, segments, materials.steel);
  left.position.set(0.63, 0.96, 0);
  const insert = cylinderX(0.205, 0.1, segments, materials.rubber);
  insert.position.set(0.8, 0.96, 0);
  const right = cylinderX(0.24, 0.24, segments, materials.steel);
  right.position.set(0.97, 0.96, 0);
  group.add(left, insert, right);
  return group;
}

function createMotor(materials: MaterialSet, segments: number) {
  const group = new THREE.Group();
  const body = cylinderX(0.62, 1.55, segments, materials.paintDark);
  body.position.set(1.55, 0.96, 0);
  group.add(body);
  for (let index = 0; index < 7; index += 1) {
    const ring = torusX(0.63, 0.025, segments, materials.paint);
    ring.position.set(0.98 + index * 0.19, 0.96, 0);
    group.add(ring);
  }
  const front = cylinderX(0.49, 0.18, segments, materials.paint);
  front.position.set(0.78, 0.96, 0);
  const rear = cylinderX(0.48, 0.18, segments, materials.paint);
  rear.position.set(2.35, 0.96, 0);
  group.add(front, rear);
  const fanCover = cylinderX(0.42, 0.2, segments, materials.darkSteel);
  fanCover.position.set(2.53, 0.96, 0);
  group.add(fanCover);
  const terminal = mesh(new THREE.BoxGeometry(0.55, 0.28, 0.42), materials.paint);
  terminal.position.set(1.55, 1.59, 0);
  group.add(terminal);
  const footA = mesh(new THREE.BoxGeometry(0.58, 0.22, 0.38), materials.paintDark);
  footA.position.set(1.15, 0.36, 0.35);
  const footB = footA.clone();
  footB.position.set(1.95, 0.36, -0.35);
  group.add(footA, footB);
  return group;
}

function createSensor(materials: MaterialSet, segments: number, position: THREE.Vector3, isTemperature: boolean) {
  const group = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, segments), materials.sensor);
  stem.position.copy(position);
  const cap = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, segments), isTemperature ? materials.amber : materials.sensor);
  cap.position.copy(position).add(new THREE.Vector3(0, 0.18, 0));
  const cable = torusX(0.13, 0.018, segments, materials.rubber);
  cable.position.copy(position).add(new THREE.Vector3(0.02, 0.28, 0));
  group.add(stem, cap, cable);
  return group;
}

export function createPumpModel(contract: PumpContract, quality: "desktop" | "mobile" = "desktop"): PumpModel {
  const segments = quality === "desktop" ? 48 : 24;
  const materials = createMaterials();
  const root = new THREE.Group();
  root.name = "pump_root";
  root.userData.assetId = contract.assetId;
  root.userData.truthStatus = contract.truthStatus;

  const factories: Record<string, () => THREE.Group> = {
    volute: () => createVolute(materials, segments),
    impeller: () => createImpeller(materials, segments),
    shaft: () => createShaft(materials, segments),
    bearing_front: () => createBearing(materials, segments, -0.2),
    bearing_rear: () => createBearing(materials, segments, 0.28),
    mechanical_seal: () => createSeal(materials, segments),
    coupling: () => createCoupling(materials, segments),
    motor: () => createMotor(materials, segments),
    baseplate: () => createBaseplate(materials),
    sensor_vibration: () => createSensor(materials, segments, new THREE.Vector3(-0.08, 1.42, 0.2), false),
    sensor_temperature: () => createSensor(materials, segments, new THREE.Vector3(0.28, 1.42, -0.2), true),
  };

  const parts = new Map<string, THREE.Group>();
  contract.parts.forEach((definition) => {
    const factory = factories[definition.id];
    if (!factory) throw new Error(`Unsupported pump part: ${definition.id}`);
    const part = factory();
    consolidatePartMeshes(part, definition.id === "volute");
    decoratePart(part, definition);
    parts.set(definition.id, part);
    root.add(part);
  });

  function setExplode(progress: number) {
    const clamped = THREE.MathUtils.clamp(progress, 0, 1);
    contract.parts.forEach((definition) => {
      const part = parts.get(definition.id);
      if (!part) return;
      const [baseX, baseY, baseZ] = part.userData.basePosition as [number, number, number];
      const [x, y, z] = definition.explode;
      part.position.set(baseX + x * clamped, baseY + y * clamped, baseZ + z * clamped);
    });
  }

  function selectPart(id: string | null) {
    parts.forEach((part, partId) => {
      const selected = id === partId;
      part.scale.setScalar(selected ? 1.035 : 1);
      part.traverse((child) => {
        if (child instanceof THREE.Mesh) child.renderOrder = selected ? 2 : 0;
      });
    });
  }

  function dispose() {
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    Object.values(materials).forEach((material) => material.dispose());
  }

  return { root, parts, setExplode, selectPart, dispose };
}
