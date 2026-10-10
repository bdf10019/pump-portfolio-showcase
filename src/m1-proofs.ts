import "./m1-proofs.css";
import { M1_PROOFS, getM1Proof, type M1ProofId } from "./m1-proof-contract";
import { getSignal, type SignalId } from "./story-contract";
import type { StorySceneController } from "./story-scene";

const requireElement = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
};

const body = requireElement<HTMLBodyElement>("body");
const stage = requireElement<HTMLElement>("#proof-visual");
const canvas = requireElement<HTMLCanvasElement>("#proof-canvas");
const poster = requireElement<HTMLElement>("#proof-poster");
const renderStatus = requireElement<HTMLElement>("#proof-render-status");
const motionToggle = requireElement<HTMLButtonElement>("#proof-motion-toggle");
const proofIndex = requireElement<HTMLElement>("#proof-index");
const proofTitle = requireElement<HTMLElement>("#proof-title");
const proofPurpose = requireElement<HTMLElement>("#proof-purpose");
const proofViewport = requireElement<HTMLElement>("#proof-viewport");
const mobileDetail = requireElement<HTMLElement>("#mobile-signal-detail");
const proofTabs = [...document.querySelectorAll<HTMLButtonElement>("[data-proof-target]")];
const proofPanels = [...document.querySelectorAll<HTMLElement>("[data-proof-panel]")];
const mobileSignalButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-mobile-signal]")];
const systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const forcedStatic = new URLSearchParams(window.location.search).get("mode") === "static";

let controller: StorySceneController | null = null;
let manualReduced = false;
let activeProof = getM1Proof(new URLSearchParams(window.location.search).get("proof"));
let activeSignal: SignalId = activeProof.signal;

function motionReduced() {
  return systemReduced.matches || manualReduced;
}

function updateMotionMode() {
  const reduced = motionReduced();
  body.classList.toggle("is-reduced", reduced);
  motionToggle.setAttribute("aria-pressed", String(manualReduced));
  motionToggle.textContent = manualReduced ? "恢復動態" : "減少動態";
  controller?.setReducedMotion(reduced);
  controller?.setProgress(activeProof.progress);
}

function updateUrl(id: M1ProofId) {
  const url = new URL(window.location.href);
  url.searchParams.set("proof", id);
  window.history.replaceState({ proof: id }, "", url);
}

function selectProof(id: M1ProofId, updateHistory = true) {
  activeProof = getM1Proof(id);
  activeSignal = activeProof.signal;
  body.dataset.proof = activeProof.id;
  proofTabs.forEach((tab) => {
    const selected = tab.dataset.proofTarget === activeProof.id;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  proofPanels.forEach((panel) => panel.setAttribute("aria-hidden", String(panel.dataset.proofPanel !== activeProof.id)));
  proofIndex.textContent = activeProof.index;
  proofTitle.textContent = activeProof.title;
  proofPurpose.textContent = activeProof.purpose;
  proofViewport.textContent = activeProof.viewport;
  controller?.setSignal(activeSignal);
  controller?.setProgress(activeProof.progress);
  if (updateHistory) updateUrl(activeProof.id);
}

function selectMobileSignal(id: SignalId) {
  activeSignal = id;
  const signal = getSignal(id);
  mobileSignalButtons.forEach((button) => {
    const selected = button.dataset.mobileSignal === id;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  mobileDetail.textContent = `${signal.truth}：${signal.description}`;
  controller?.setSignal(id);
}

proofTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectProof(tab.dataset.proofTarget as M1ProofId));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + proofTabs.length) % proofTabs.length;
    const next = proofTabs[nextIndex];
    next.focus();
    selectProof(next.dataset.proofTarget as M1ProofId);
  });
});

mobileSignalButtons.forEach((button) => button.addEventListener("click", () => selectMobileSignal(button.dataset.mobileSignal as SignalId)));
motionToggle.addEventListener("click", () => {
  manualReduced = !manualReduced;
  updateMotionMode();
});
systemReduced.addEventListener("change", updateMotionMode);
window.addEventListener("resize", () => controller?.resize());
window.addEventListener("popstate", () => selectProof(getM1Proof(new URLSearchParams(window.location.search).get("proof")).id, false));

selectProof(activeProof.id, false);
selectMobileSignal(activeSignal);
updateMotionMode();

async function initializeScene() {
  if (forcedStatic) {
    body.classList.add("is-fallback");
    renderStatus.textContent = "靜態模式";
    return;
  }

  try {
    renderStatus.textContent = "載入 3D";
    const { createStoryScene } = await import("./story-scene");
    controller = await createStoryScene({
      canvas,
      stage,
      reducedMotion: motionReduced(),
      onReady: () => {
        poster.classList.add("is-hidden");
        canvas.classList.add("is-ready");
        renderStatus.textContent = "共用模型就緒";
        renderStatus.classList.add("is-ready");
      },
      onFailure: (message) => {
        body.classList.add("is-fallback");
        poster.classList.remove("is-hidden");
        renderStatus.textContent = "靜態模式";
        renderStatus.title = message;
      },
    });
    controller.setSignal(activeSignal);
    controller.setProgress(activeProof.progress);
  } catch (error) {
    body.classList.add("is-fallback");
    renderStatus.textContent = "靜態模式";
    renderStatus.title = error instanceof Error ? error.message : "3D 初始化失敗";
  }
}

void initializeScene();
window.addEventListener("pagehide", () => controller?.dispose(), { once: true });

if (M1_PROOFS.length !== proofTabs.length) {
  throw new Error("M1 proof controls do not match the authored proof contract.");
}
