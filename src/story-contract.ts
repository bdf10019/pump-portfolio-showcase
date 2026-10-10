export type Vec3Tuple = [number, number, number];
export type SceneId = "opening" | "system" | "signals";
export type SignalId = "vibration" | "temperature" | "safety";
export type SystemRoutePhase = "overview" | "supply" | "return";
export type StoryShotId =
  | "hero-recognizable"
  | "hero-departure"
  | "loop-arrival"
  | "loop-overview"
  | "signal-arrival"
  | "signal-focus";

export type StoryState = {
  scene: SceneId;
  shot: StoryShotId;
  localProgress: number;
  systemRoutePhase: SystemRoutePhase;
  camera: Vec3Tuple;
  target: Vec3Tuple;
  pumpScale: number;
  pumpRotation: number;
  systemOpacity: number;
  signalOpacity: number;
  keyIntensity: number;
  exposure: number;
};

export const SCENES: ReadonlyArray<{ id: SceneId; index: string; label: string }> = [
  { id: "opening", index: "01", label: "開場布幕" },
  { id: "system", index: "02", label: "完整水路" },
  { id: "signals", index: "03", label: "異常觀察" },
];

export const SIGNALS: ReadonlyArray<{ id: SignalId; title: string; description: string; truth: string }> = [
  { id: "vibration", title: "持續震動", description: "這是需要判讀的觀察，不等於已確認軸承故障。", truth: "合成觀察" },
  { id: "temperature", title: "軸承溫度偏高", description: "需要與負載、趨勢及歷史事件一起判讀，不單靠顏色決定結果。", truth: "合成觀察" },
  { id: "safety", title: "未發現危害跡象", description: "沒有洩漏、火花或焦味；否定敘述不應被呈現為正在發生的事故。", truth: "否定安全觀察" },
];

export const SYSTEM_ROUTE_PHASES: ReadonlyArray<{ id: SystemRoutePhase; label: string; title: string; description: string; truth: string; localProgress: number }> = [
  { id: "overview", label: "總覽", title: "先確認四個地標", description: "水箱、水泵、換熱設備與回水構成同一條閉式路徑。", truth: "設備關係示意", localProgress: 0.42 },
  { id: "supply", label: "供水", title: "水泵把水送往負載端", description: "青色路徑依序連接水箱、水泵與換熱設備；只表示方向。", truth: "方向示意", localProgress: 0.56 },
  { id: "return", label: "回水", title: "回水返回水箱", description: "深藍路徑由換熱設備返回水箱，下一幕再核對觀察訊號。", truth: "方向示意", localProgress: 0.62 },
];

export const SCENE_RANGES: Readonly<Record<SceneId, readonly [number, number]>> = {
  opening: [0, 0.34],
  system: [0.34, 0.72],
  signals: [0.72, 1],
};

type ShotFrame = {
  at: number;
  shot: StoryShotId;
  state: Omit<StoryState, "scene" | "shot" | "localProgress" | "systemRoutePhase">;
};

export const STORY_SHOTS: ReadonlyArray<ShotFrame> = [
  { at: 0, shot: "hero-recognizable", state: { camera: [-5.6, 3.15, 6.7], target: [0.2, 0.98, 0], pumpScale: 1, pumpRotation: -0.03, systemOpacity: 0, signalOpacity: 0, keyIntensity: 2.8, exposure: 0.76 } },
  { at: 0.2, shot: "hero-departure", state: { camera: [-5.6, 3.15, 6.7], target: [0.2, 0.98, 0], pumpScale: 1, pumpRotation: 0.03, systemOpacity: 0, signalOpacity: 0, keyIntensity: 3.45, exposure: 0.86 } },
  { at: 0.34, shot: "loop-arrival", state: { camera: [-2.45, 7.1, 4.15], target: [0.05, 0.65, 0], pumpScale: 0.94, pumpRotation: 0.015, systemOpacity: 0.48, signalOpacity: 0, keyIntensity: 3.05, exposure: 0.84 } },
  { at: 0.48, shot: "loop-overview", state: { camera: [0.05, 11.2, 0.9], target: [0, 0.4, 0], pumpScale: 0.88, pumpRotation: 0, systemOpacity: 1, signalOpacity: 0, keyIntensity: 2.8, exposure: 0.82 } },
  { at: 0.68, shot: "loop-overview", state: { camera: [0.05, 11.2, 0.9], target: [0, 0.4, 0], pumpScale: 0.88, pumpRotation: 0, systemOpacity: 1, signalOpacity: 0, keyIntensity: 2.8, exposure: 0.82 } },
  { at: 0.86, shot: "signal-arrival", state: { camera: [-4.4, 2.55, 5.6], target: [-0.05, 1.02, 0], pumpScale: 1.08, pumpRotation: 0.04, systemOpacity: 0.18, signalOpacity: 1, keyIntensity: 3.25, exposure: 0.88 } },
  { at: 1, shot: "signal-focus", state: { camera: [-4.4, 2.55, 5.6], target: [-0.05, 1.02, 0], pumpScale: 1.08, pumpRotation: 0.04, systemOpacity: 0.12, signalOpacity: 1, keyIntensity: 3.25, exposure: 0.88 } },
];

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpVec(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function getSceneId(progress: number): SceneId {
  const value = clamp01(progress);
  if (value < 0.34) return "opening";
  if (value < 0.72) return "system";
  return "signals";
}

export function getSceneLocalProgress(scene: SceneId, progress: number) {
  const [start, end] = SCENE_RANGES[scene];
  return clamp01((clamp01(progress) - start) / Math.max(end - start, Number.EPSILON));
}

export function getStoryProgress(scene: SceneId, localProgress: number) {
  const [start, end] = SCENE_RANGES[scene];
  return lerp(start, end, clamp01(localProgress));
}

export function getStoryShot(progress: number): StoryShotId {
  const value = clamp01(progress);
  let shot = STORY_SHOTS[0].shot;
  for (const frame of STORY_SHOTS) {
    if (value < frame.at) break;
    shot = frame.shot;
  }
  return shot;
}

export function getSystemRoutePhase(scene: SceneId, localProgress: number): SystemRoutePhase {
  if (scene === "opening") return "overview";
  if (scene === "signals") return "return";
  const value = clamp01(localProgress);
  if (value < 0.5) return "overview";
  if (value < 0.61) return "supply";
  return "return";
}

export function getSystemRoute(id: string, detailed=false) {
  const phase=SYSTEM_ROUTE_PHASES.find((phase) => phase.id === id) ?? SYSTEM_ROUTE_PHASES[0];
  if(!detailed)return phase;
  const copy={
    overview:{title:'同一台水泵，連接閉式機組',description:'左側回水經過濾與分離器進泵，右側換熱後供水；灰紅膨脹桶是支管，冷源另成回路。'},
    supply:{title:'從水泵排出口送往換熱器',description:'青色線沿排出管、止回／隔離閥與換熱器到外部負載；冷源水不與製程水混合。'},
    return:{title:'外部回水回到水泵入口',description:'藍色線由畫面外返回，經閥件、過濾器及分離器到泵入口；閉環由畫面外負載完成。'},
  };
  return {...phase,...copy[phase.id]};
}

export function getStableStoryProgress(progress: number) {
  const value = clamp01(progress);
  const scene = getSceneId(value);
  if (scene === "opening") return 0.12;
  if (scene === "signals") return 0.94;
  const phase = getSystemRoutePhase(scene, getSceneLocalProgress(scene, value));
  return getStoryProgress(scene, getSystemRoute(phase).localProgress);
}

export function getStoryState(progress: number): StoryState {
  const value = clamp01(progress);
  let from = STORY_SHOTS[0];
  let to = STORY_SHOTS[STORY_SHOTS.length - 1];
  for (let index = 1; index < STORY_SHOTS.length; index += 1) {
    if (value <= STORY_SHOTS[index].at) {
      from = STORY_SHOTS[index - 1];
      to = STORY_SHOTS[index];
      break;
    }
  }
  const range = Math.max(to.at - from.at, Number.EPSILON);
  const mix = smoothstep((value - from.at) / range);
  const scene = getSceneId(value);
  const localProgress = getSceneLocalProgress(scene, value);
  return {
    scene,
    shot: getStoryShot(value),
    localProgress,
    systemRoutePhase: getSystemRoutePhase(scene, localProgress),
    camera: lerpVec(from.state.camera, to.state.camera, mix),
    target: lerpVec(from.state.target, to.state.target, mix),
    pumpScale: lerp(from.state.pumpScale, to.state.pumpScale, mix),
    pumpRotation: lerp(from.state.pumpRotation, to.state.pumpRotation, mix),
    systemOpacity: lerp(from.state.systemOpacity, to.state.systemOpacity, mix),
    signalOpacity: lerp(from.state.signalOpacity, to.state.signalOpacity, mix),
    keyIntensity: lerp(from.state.keyIntensity, to.state.keyIntensity, mix),
    exposure: lerp(from.state.exposure, to.state.exposure, mix),
  };
}

export function getSignal(id: string) {
  return SIGNALS.find((signal) => signal.id === id) ?? SIGNALS[0];
}
