import "./story.css";
import { SCENES, getSignal, getStoryProgress, getStoryState, getSystemRoute, type SceneId, type SignalId, type SystemRoutePhase } from "./story-contract";
import type { StorySceneController } from "./story-scene";

const requireElement = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const body = requireElement<HTMLBodyElement>("body");
const canvas = requireElement<HTMLCanvasElement>("#story-canvas");
const stage = requireElement<HTMLElement>("#visual-stage");
const poster = requireElement<HTMLElement>("#story-poster");
const status = requireElement<HTMLElement>("#render-status");
const motionToggle = requireElement<HTMLButtonElement>("#motion-toggle");
const stageIndex = requireElement<HTMLElement>("#stage-index");
const stageLabel = requireElement<HTMLElement>("#stage-label");
const signalDetail = requireElement<HTMLElement>("#signal-detail");
const systemRouteDetail = requireElement<HTMLElement>("#system-route-detail");
const systemSection = requireElement<HTMLElement>("#system");
const sceneSections = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
const signalButtons = [...document.querySelectorAll<HTMLButtonElement>("button[data-signal]")];
const systemRouteButtons = [...document.querySelectorAll<HTMLButtonElement>("button[data-route-phase]")];
const systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const requestedMode = new URLSearchParams(window.location.search).get("mode");
const forcedStatic = requestedMode === "static";
const forcedFailure = requestedMode === "fallback";
const detailedDesktop=matchMedia('(min-width:1100px) and (min-height:700px)').matches;
body.dataset.waterLayout=detailedDesktop?'detailed':'legacy';
if(detailedDesktop){
 requireElement('#system-title').textContent='從回水到供水，看懂同一台水泵。';
 const labels=[['回水入口','來自畫面外負載'],['水泵','推動循環的主角'],['板式換熱器','製程與冷源隔離'],['外部供水','經負載後回流']];
 document.querySelectorAll('.system-route li').forEach((li,i)=>{li.querySelector('strong')!.textContent=labels[i][0];li.querySelector('small')!.textContent=labels[i][1];li.setAttribute('data-route-segment',i===0?'return':'supply');});
 // The no-WebGL desktop poster must show the same topology as the live model.
 requireElement('.poster-loop').innerHTML='<path d="M0 390H470M490 360V240H870V390H960M1020 390H1200"/><path d="M330 390V550"/><circle cx="330" cy="575" r="35"/><rect x="960" y="330" width="60" height="130" rx="5"/><path d="M960 350H920V160H1200M1020 425H1080V200H1200"/>';
}

let controller: StorySceneController | null = null;
let manualReduced = false;
let activeSignal: SignalId = "vibration";
let activeSystemRoute: SystemRoutePhase = "overview";
let framePending = false;
let currentProgress = 0;
let sceneGeometry: Array<{ id: SceneId; start: number; end: number }> = [];

function motionReduced() {
  return systemReduced.matches || manualReduced;
}

function updateMotionMode() {
  const reduced = motionReduced();
  body.classList.toggle("is-reduced", reduced);
  document.documentElement.style.scrollBehavior=reduced?'auto':'';
  motionToggle.setAttribute("aria-pressed", String(manualReduced));
  motionToggle.textContent = manualReduced ? "恢復動態" : "減少動態";
  controller?.setReducedMotion(reduced);
  controller?.setProgress(currentProgress);
}

function updateSceneChrome(progress: number) {
  const state = getStoryState(progress);
  const scene = SCENES.find((item) => item.id === state.scene) ?? SCENES[0];
  body.dataset.scene = state.scene;
  body.dataset.shot = state.shot;
  updateSystemRoute(state.systemRoutePhase);
  body.style.setProperty("--scene-progress", state.localProgress.toFixed(4));
  stageIndex.textContent = scene.index;
  stageLabel.textContent = scene.label;
  sceneSections.forEach((section) => section.classList.toggle("is-active", section.dataset.scene === state.scene));
}

function updateSystemRoute(id: SystemRoutePhase) {
  if (activeSystemRoute === id && systemRouteDetail.dataset.routePhase === id && systemRouteDetail.dataset.layout === body.dataset.waterLayout) return;
  activeSystemRoute = id;
  const phase = getSystemRoute(id,detailedDesktop);
  body.dataset.routePhase = id;
  systemRouteDetail.dataset.routePhase = id;
  systemRouteDetail.dataset.layout=body.dataset.waterLayout;
  systemRouteButtons.forEach((button) => {
    const selected = button.dataset.routePhase === id;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  systemRouteDetail.innerHTML = `<span>${phase.truth}</span><strong>${phase.title}</strong><p>${phase.description}</p>`;
}

function moveToSystemRoute(id: SystemRoutePhase) {
  const phase = getSystemRoute(id);
  measureStoryGeometry();
  const target = systemSection.offsetTop + systemSection.offsetHeight * phase.localProgress - window.innerHeight * 0.5;
  window.scrollTo({ top: Math.max(0, target), behavior: motionReduced() ? "auto" : "smooth" });
}

function measureStoryGeometry() {
  sceneGeometry = sceneSections.map((section) => ({
    id: section.dataset.scene as SceneId,
    start: section.offsetTop,
    end: Math.max(section.offsetTop + section.offsetHeight, section.offsetTop + 1),
  }));
}

function calculateProgress() {
  if (sceneGeometry.length === 0) measureStoryGeometry();
  const anchor = window.scrollY + window.innerHeight * 0.5;
  let active = sceneGeometry[0];
  for (const geometry of sceneGeometry) {
    if (anchor < geometry.start) break;
    active = geometry;
  }
  const localProgress = Math.min(1, Math.max(0, (anchor - active.start) / (active.end - active.start)));
  return getStoryProgress(active.id, localProgress);
}

function updateFromScroll() {
  framePending = false;
  currentProgress = calculateProgress();
  document.documentElement.style.setProperty("--story-progress", currentProgress.toFixed(4));
  updateSceneChrome(currentProgress);
  controller?.setProgress(currentProgress);
}

function scheduleScrollUpdate() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(updateFromScroll);
}

function selectSignal(id: SignalId, moveFocus = false) {
  activeSignal = id;
  const signal = getSignal(id);
  body.dataset.signal = id;
  signalDetail.dataset.signal = id;
  signalButtons.forEach((button) => {
    const selected = button.dataset.signal === id;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
    if (selected && moveFocus) button.focus();
  });
  signalDetail.innerHTML = `<span>目前聚焦 · ${signal.truth}</span><strong>${signal.title}</strong><p>${signal.description}</p>`;
  controller?.setSignal(id);
}

function activateFallback(message: string, simulated = false) {
  body.classList.add("is-fallback");
  body.dataset.renderMode = simulated ? "simulated-fallback" : "fallback";
  poster.classList.remove("is-hidden");
  canvas.classList.remove("is-ready");
  status.textContent = "靜態模式";
  status.title = message;
}

motionToggle.addEventListener("click", () => {
  manualReduced = !manualReduced;
  updateMotionMode();
});
systemReduced.addEventListener("change", updateMotionMode);
signalButtons.forEach((button) => button.addEventListener("click", () => selectSignal(button.dataset.signal as SignalId)));
systemRouteButtons.forEach((button) => button.addEventListener("click", () => moveToSystemRoute(button.dataset.routePhase as SystemRoutePhase)));
window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
window.addEventListener("resize", () => {
  measureStoryGeometry();
  controller?.resize();
  scheduleScrollUpdate();
});
window.addEventListener("load", () => {
  measureStoryGeometry();
  scheduleScrollUpdate();
});

void document.fonts.ready.then(() => {
  measureStoryGeometry();
  scheduleScrollUpdate();
});

measureStoryGeometry();
updateMotionMode();
updateSystemRoute(activeSystemRoute);
selectSignal(activeSignal);
updateFromScroll();

async function initializeRichScene() {
  try {
    status.textContent = "載入 3D";
    const { createStoryScene } = await import("./story-scene");
    controller = await createStoryScene({
      canvas,
      stage,
      reducedMotion: motionReduced(),
      onReady: () => {
        body.dataset.renderMode = "3d";
        poster.classList.add("is-hidden");
        canvas.classList.add("is-ready");
        status.textContent = "3D 就緒";
        status.classList.add("is-ready");
      },
      onFailure: (message) => {
        activateFallback(message);
      },
    });
    controller.setSignal(activeSignal);
    controller.setProgress(currentProgress);
  } catch (error) {
    activateFallback(error instanceof Error ? error.message : "3D 初始化失敗");
  }
}

if (forcedStatic) {
  activateFallback("以網址參數啟用靜態驗收模式。");
  body.dataset.renderMode = "static";
} else if (forcedFailure) {
  activateFallback("QA 模擬 3D 初始化失敗；已保留靜態海報與完整內容。", true);
} else {
  void initializeRichScene();
}

window.addEventListener("pagehide", () => controller?.dispose(), { once: true });
