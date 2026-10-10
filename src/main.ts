import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createPumpModel, type PartDefinition, type PumpContract } from "./pump-detailed";
import "./style.css";

type LightSceneId = "curtain" | "system" | "anomaly" | "isolated" | "exploded" | "reassembled";
type LightingContract = {
  pointerFollow: {
    keyAzimuthRange: number;
    keyElevationRange: number;
    fillCounterMotionRatio: number;
    modelParallaxDegrees: number;
    settleMilliseconds: number;
    returnDelayMilliseconds: number;
  };
  scenes: Record<LightSceneId, { azimuth: number; elevation: number }>;
};

const requireElement = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const canvas = requireElement<HTMLCanvasElement>("#pump-canvas");
const shell = requireElement<HTMLElement>("#canvas-shell");
const poster = requireElement<HTMLElement>("#poster");
const renderStatus = requireElement<HTMLElement>("#render-status");
const quadLabels = requireElement<HTMLElement>("#quad-labels");
const canvasHelp = requireElement<HTMLElement>("#canvas-help");
const range = requireElement<HTMLInputElement>("#explode-range");
const rangeOutput = requireElement<HTMLOutputElement>("#explode-output");
const lightingSelect = requireElement<HTMLSelectElement>("#lighting-scene");
const pointerLightInput = requireElement<HTMLInputElement>("#pointer-light");
const partsGrid = requireElement<HTMLElement>("#parts-grid");
const partName = requireElement<HTMLElement>("#part-name");
const partId = requireElement<HTMLElement>("#part-id");
const partFunction = requireElement<HTMLElement>("#part-function");
const partSignal = requireElement<HTMLElement>("#part-signal");
const partTruth = requireElement<HTMLElement>("#part-truth");
const metricCalls = requireElement<HTMLElement>("#metric-calls");
const metricTriangles = requireElement<HTMLElement>("#metric-triangles");
const metricDpr = requireElement<HTMLElement>("#metric-dpr");
const exportButton = requireElement<HTMLButtonElement>("#export-glb");
const detailSelect = requireElement<HTMLSelectElement>("#detail-part");
const focusButton = requireElement<HTMLButtonElement>("#focus-part");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const mobileQuery = window.matchMedia("(max-width: 720px)");

const [pumpResponse, lightingResponse] = await Promise.all([
  fetch("/assets/pump-core-v1/pump-core-parts-v1.json"),
  fetch("/assets/pump-core-v1/pump-lighting-contract-v1.json"),
]);

if (!pumpResponse.ok || !lightingResponse.ok) throw new Error("素材契約載入失敗");

const pumpContract = (await pumpResponse.json()) as PumpContract;
const lightingContract = (await lightingResponse.json()) as LightingContract;
detailSelect.innerHTML = pumpContract.parts.map(part => `<option value="${part.id}">${part.label}</option>`).join("");

partsGrid.innerHTML = pumpContract.parts
  .map(
    (part, index) => `
      <button class="part-button${index === 0 ? " is-active" : ""}" type="button" data-part="${part.id}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${part.label}</strong>
        <small>${part.id}</small>
      </button>`,
  )
  .join("");

if (!WebGL.isWebGL2Available()) {
  renderStatus.textContent = "靜態替代";
  renderStatus.classList.add("status-pill--warning");
  canvas.hidden = true;
  canvasHelp.textContent = "此瀏覽器無法建立 WebGL 2；仍可閱讀所有零件與材質說明。";
} else {
  initializeViewer();
}

function initializeViewer() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const dprCap = mobileQuery.matches ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b1114, 0.012);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(environmentScene, 0.04);
  scene.environment = environmentTarget.texture;
  environmentScene.dispose();
  pmrem.dispose();

  const aspect = Math.max(shell.clientWidth, 1) / Math.max(shell.clientHeight, 1);
  const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
  camera.position.set(-5.1, 3.25, 5.7);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.25, 0.95, 0);
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = 0.075;
  controls.minDistance = 0.8;
  controls.maxDistance = 24;
  controls.maxPolarAngle = Math.PI * 0.82;
  controls.update();

  const pump = createPumpModel(pumpContract, mobileQuery.matches ? "mobile" : "desktop");
  scene.add(pump.root);

  const floorMaterial = new THREE.ShadowMaterial({ color: 0x071014, opacity: 0.34 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  const keyLight = new THREE.DirectionalLight(0xfff4e8, 3.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(mobileQuery.matches ? 1024 : 2048, mobileQuery.matches ? 1024 : 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.camera.left = -5;
  keyLight.shadow.camera.right = 5;
  keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.bottom = -3;
  keyLight.shadow.bias = -0.0008;
  scene.add(keyLight, keyLight.target);

  const fillLight = new THREE.DirectionalLight(0xddeeff, 0.7);
  scene.add(fillLight, fillLight.target);
  const rimLight = new THREE.DirectionalLight(0xffd5b0, 1.9);
  scene.add(rimLight, rimLight.target);
  const topLight = new THREE.DirectionalLight(0xf4f7ff, 0.78);
  scene.add(topLight, topLight.target);
  const hemisphere = new THREE.HemisphereLight(0xbad9e8, 0x101417, 0.72);
  scene.add(hemisphere);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let lastPointerAt = performance.now();
  let selectedPartId: string | null = pumpContract.parts[0]?.id ?? null;
  let activeView = "three-quarter";
  let activeLighting = lightingSelect.value as LightSceneId;
  let lightAzimuth = lightingContract.scenes[activeLighting].azimuth;
  let lightElevation = lightingContract.scenes[activeLighting].elevation;
  let lastMetricUpdate = 0;
  let animationFrame = 0;
  let isolated = false;
  const viewPositions: Record<string, THREE.Vector3> = {
    "three-quarter": new THREE.Vector3(-5.1, 3.0, 6.8),
    front: new THREE.Vector3(0, 0.3, 8),
    side: new THREE.Vector3(-8, 0.3, 0.01),
    top: new THREE.Vector3(0, 8, 0.01),
  };
  const quadCamera = camera.clone();

  selectPart(selectedPartId);
  updateLights(lightAzimuth, lightElevation);
  resize();
  poster.classList.add("is-hidden");
  canvas.classList.add("is-ready");
  renderStatus.textContent = "3D 就緒";
  renderStatus.classList.add("status-pill--ready");

  function positionFromAngles(azimuth: number, elevation: number, radius: number) {
    const azimuthRadians = THREE.MathUtils.degToRad(azimuth);
    const elevationRadians = THREE.MathUtils.degToRad(elevation);
    const horizontal = Math.cos(elevationRadians) * radius;
    return new THREE.Vector3(
      Math.sin(azimuthRadians) * horizontal,
      Math.sin(elevationRadians) * radius,
      Math.cos(azimuthRadians) * horizontal,
    ).add(new THREE.Vector3(0.25, 0.8, 0));
  }

  function updateLights(azimuth: number, elevation: number) {
    keyLight.position.copy(positionFromAngles(azimuth, elevation, 7.5));
    const fillOffset = pointer.x * lightingContract.pointerFollow.keyAzimuthRange * lightingContract.pointerFollow.fillCounterMotionRatio;
    fillLight.position.copy(positionFromAngles(55 - fillOffset, 20, 6.5));
    rimLight.position.copy(positionFromAngles(145, 35, 6.8));
    topLight.position.copy(positionFromAngles(0, 85, 6));
    [keyLight, fillLight, rimLight, topLight].forEach((light) => light.target.position.set(0.25, 0.85, 0));
  }

  function selectPart(id: string | null) {
    selectedPartId = id;
    pump.selectPart(id);
    document.querySelectorAll<HTMLButtonElement>("[data-part]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.part === id);
      button.setAttribute("aria-pressed", String(button.dataset.part === id));
    });
    const definition = pumpContract.parts.find((part) => part.id === id);
    if (!definition) return;
    partName.textContent = definition.label;
    partId.textContent = definition.id;
    partFunction.textContent = definition.function;
    partSignal.textContent = definition.signal;
    partTruth.textContent = definition.truth;
    detailSelect.value = definition.id;
    if (isolated) showDetail(true);
  }

  function showDetail(enabled: boolean) {
    isolated = enabled;
    pump.parts.forEach((part, id) => { part.visible = !isolated || id === selectedPartId; });
    focusButton.setAttribute("aria-pressed", String(isolated));
    setCameraView("three-quarter");
    canvasHelp.textContent = isolated ? "零件近觀 · 拖曳旋轉 · 返回總成可復原" : "拖曳旋轉 · 滾輪縮放 · 點選零件";
    if (enabled) shell.scrollIntoView({ block: "center", behavior: "instant" });
  }

  function setExplode(value: number) {
    const normalized = THREE.MathUtils.clamp(value / 100, 0, 1);
    range.value = String(Math.round(normalized * 100));
    rangeOutput.value = `${Math.round(normalized * 100)}%`;
    pump.setExplode(normalized);
    if (activeView !== "quad") fitCamera(camera, viewPositions[activeView], camera.aspect, true);
    document.querySelectorAll<HTMLButtonElement>("[data-state]").forEach((button) => {
      const isActive = normalized === 0 ? button.dataset.state === "assembled" : normalized === 1 && button.dataset.state === "exploded";
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setCameraView(view: string) {
    activeView = view;
    quadLabels.hidden = view !== "quad";
    controls.enabled = view !== "quad";
    canvasHelp.textContent = view === "quad" ? "四視圖基準 · 正視、三分之四、側視、俯視" : "拖曳旋轉 · 滾輪縮放 · 點選零件";
    document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
      const isActive = button.dataset.view === view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    const position = viewPositions[view];
    if (position) {
      fitCamera(camera, position, shell.clientWidth / shell.clientHeight, true);
    }
  }

  function fitCamera(targetCamera: THREE.PerspectiveCamera, direction: THREE.Vector3, aspectRatio: number, syncControls = false) {
    pump.root.updateMatrixWorld(true);
    const subject = isolated && selectedPartId ? pump.parts.get(selectedPartId)! : pump.root;
    const bounds = new THREE.Box3().setFromObject(subject);
    const center = bounds.getCenter(new THREE.Vector3());
    const outward = direction.clone().normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), outward).normalize();
    const up = new THREE.Vector3().crossVectors(outward, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(targetCamera.fov / 2));
    const tanH = tanV * aspectRatio;
    let distance = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const relative = new THREE.Vector3(x, y, z).sub(center);
      const depth = relative.dot(outward);
      distance = Math.max(distance, depth + Math.abs(relative.dot(right)) / tanH, depth + Math.abs(relative.dot(up)) / tanV);
    }
    targetCamera.aspect = aspectRatio;
    targetCamera.position.copy(center).addScaledVector(outward, distance * 1.12);
    targetCamera.lookAt(center);
    targetCamera.updateProjectionMatrix();
    if (syncControls) { controls.target.copy(center); controls.update(); }
  }

  function renderQuad() {
    const width = shell.clientWidth;
    const height = shell.clientHeight;
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    const views = [
      { position: viewPositions.front, x: 0, y: halfHeight },
      { position: viewPositions["three-quarter"], x: halfWidth, y: halfHeight },
      { position: viewPositions.side, x: 0, y: 0 },
      { position: viewPositions.top, x: halfWidth, y: 0 },
    ];
    renderer.setScissorTest(true);
    views.forEach((view) => {
      fitCamera(quadCamera, view.position, halfWidth / halfHeight);
      renderer.setViewport(view.x, view.y, halfWidth, halfHeight);
      renderer.setScissor(view.x, view.y, halfWidth, halfHeight);
      renderer.render(scene, quadCamera);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
  }

  function animate(time: number) {
    const pointerEnabled = pointerLightInput.checked && finePointer.matches && !reducedMotion.matches && activeView !== "quad";
    const pointerIsFresh = time - lastPointerAt < lightingContract.pointerFollow.returnDelayMilliseconds;
    const targetPointer = pointerEnabled && pointerIsFresh ? pointerTarget : new THREE.Vector2(0, 0);
    const damping = 1 - Math.exp(-16.7 / lightingContract.pointerFollow.settleMilliseconds);
    pointer.lerp(targetPointer, damping);

    const preset = lightingContract.scenes[activeLighting];
    const targetAzimuth = preset.azimuth + pointer.x * lightingContract.pointerFollow.keyAzimuthRange;
    const targetElevation = preset.elevation + pointer.y * lightingContract.pointerFollow.keyElevationRange;
    lightAzimuth = THREE.MathUtils.lerp(lightAzimuth, targetAzimuth, damping);
    lightElevation = THREE.MathUtils.lerp(lightElevation, targetElevation, damping);
    updateLights(lightAzimuth, lightElevation);

    const modelTilt = THREE.MathUtils.degToRad(lightingContract.pointerFollow.modelParallaxDegrees);
    pump.root.rotation.y = THREE.MathUtils.lerp(pump.root.rotation.y, -pointer.x * modelTilt, damping);
    pump.root.rotation.x = THREE.MathUtils.lerp(pump.root.rotation.x, pointer.y * modelTilt * 0.45, damping);

    if (activeView === "quad") renderQuad();
    else {
      controls.update();
      camera.aspect = Math.max(shell.clientWidth, 1) / Math.max(shell.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }

    if (time - lastMetricUpdate > 500) {
      lastMetricUpdate = time;
      metricCalls.textContent = String(renderer.info.render.calls);
      metricTriangles.textContent = renderer.info.render.triangles.toLocaleString("zh-Hant");
      metricDpr.textContent = renderer.getPixelRatio().toFixed(2);
    }
    animationFrame = requestAnimationFrame(animate);
  }

  function resize() {
    const width = Math.max(shell.clientWidth, 1);
    const height = Math.max(shell.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (activeView !== "quad") fitCamera(camera, viewPositions[activeView], camera.aspect, true);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(shell);

  shell.addEventListener("pointermove", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, .part-inspector")) return;
    const rect = shell.getBoundingClientRect();
    pointerTarget.set(
      THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      THREE.MathUtils.clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -1, 1),
    );
    lastPointerAt = performance.now();
  });

  shell.addEventListener("pointerleave", () => {
    lastPointerAt = performance.now() - lightingContract.pointerFollow.returnDelayMilliseconds;
  });

  canvas.addEventListener("click", (event) => {
    if (activeView === "quad") return;
    const rect = canvas.getBoundingClientRect();
    const normalized = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(normalized, camera);
    const hit = raycaster.intersectObject(pump.root, true).find((intersection) => intersection.object.userData.partId);
    if (hit) selectPart(String(hit.object.userData.partId));
  });

  range.addEventListener("input", () => setExplode(Number(range.value)));
  detailSelect.addEventListener("change", () => selectPart(detailSelect.value));
  focusButton.addEventListener("click", () => showDetail(true));
  requireElement<HTMLButtonElement>("#show-all").addEventListener("click", () => showDetail(false));
  lightingSelect.addEventListener("change", () => {
    activeLighting = lightingSelect.value as LightSceneId;
  });

  document.querySelectorAll<HTMLButtonElement>("[data-state]").forEach((button) => {
    button.addEventListener("click", () => setExplode(button.dataset.state === "exploded" ? 100 : 0));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setCameraView(button.dataset.view ?? "three-quarter"));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-part]").forEach((button) => {
    button.addEventListener("click", () => selectPart(button.dataset.part ?? null));
  });

  exportButton.addEventListener("click", () => {
    const clone = pump.root.clone(true);
    clone.rotation.set(0, 0, 0);
    pumpContract.parts.forEach((part) => {
      const node = clone.getObjectByName(part.id);
      if (node) { node.position.set(0, 0, 0); node.visible = true; }
    });
    const exporter = new GLTFExporter();
    exportButton.disabled = true;
    exportButton.textContent = "正在建立 GLB…";
    exporter.parse(
      clone,
      (result) => {
        if (!(result instanceof ArrayBuffer)) throw new Error("GLB export returned JSON");
        const blob = new Blob([result], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "pump-core-detailed-v2.glb";
        anchor.hidden = true;
        document.body.append(anchor);
        anchor.click();
        window.setTimeout(() => {
          anchor.remove();
          URL.revokeObjectURL(url);
        }, 2_000);
        exportButton.disabled = false;
        exportButton.textContent = "匯出組裝 GLB";
      },
      (error) => {
        console.error(error);
        exportButton.disabled = false;
        exportButton.textContent = "匯出失敗，請重試";
      },
      { binary: true, onlyVisible: true },
    );
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(animationFrame);
    else animationFrame = requestAnimationFrame(animate);
  });

  animationFrame = requestAnimationFrame(animate);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    controls.dispose();
    pump.dispose();
    floor.geometry.dispose();
    floorMaterial.dispose();
    environmentTarget.dispose();
    renderer.dispose();
  }, { once: true });
}

export function validateContract(contract: PumpContract) {
  const ids = contract.parts.map((part: PartDefinition) => part.id);
  return {
    partCount: ids.length,
    unique: new Set(ids).size === ids.length,
    allHaveExplodeVectors: contract.parts.every((part: PartDefinition) => part.explode.length === 3 && part.explode.every(Number.isFinite)),
  };
}
