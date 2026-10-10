import { describe, expect, it } from "vitest";
import { SIGNALS, STORY_SHOTS, SYSTEM_ROUTE_PHASES, clamp01, getSceneId, getSceneLocalProgress, getSignal, getStableStoryProgress, getStoryProgress, getStoryShot, getStoryState, getSystemRoute, getSystemRoutePhase } from "../src/story-contract";

describe("前三幕故事契約", () => {
  it("將進度固定在 0 到 1 並保留三個穩定章節", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(getSceneId(0)).toBe("opening");
    expect(getSceneId(0.5)).toBe("system");
    expect(getSceneId(1)).toBe("signals");
  });

  it("鏡頭、目標、模型與光線在任意進度都保持有限值", () => {
    for (let index = 0; index <= 100; index += 1) {
      const state = getStoryState(index / 100);
      expect([...state.camera, ...state.target, state.pumpScale, state.pumpRotation, state.systemOpacity, state.signalOpacity, state.keyIntensity, state.exposure].every(Number.isFinite)).toBe(true);
      expect(state.systemOpacity).toBeGreaterThanOrEqual(0);
      expect(state.systemOpacity).toBeLessThanOrEqual(1);
    }
  });

  it("水路俯視有完整系統，訊號幕才顯示觀察標記", () => {
    const opening = getStoryState(0);
    const system = getStoryState(0.55);
    const signals = getStoryState(0.95);
    expect(opening.systemOpacity).toBe(0);
    expect(system.systemOpacity).toBe(1);
    expect(signals.signalOpacity).toBe(1);
    expect(system.camera[1]).toBeGreaterThan(opening.camera[1]);
  });

  it("使用具名鏡頭並以章節內進度重建相同狀態", () => {
    expect(STORY_SHOTS.map((frame) => frame.shot)).toContain("hero-recognizable");
    expect(STORY_SHOTS.map((frame) => frame.shot)).toContain("loop-arrival");
    expect(STORY_SHOTS.map((frame) => frame.shot)).toContain("loop-overview");
    const global = getStoryProgress("system", 0.5);
    expect(getSceneId(global)).toBe("system");
    expect(getSceneLocalProgress("system", global)).toBeCloseTo(0.5, 8);
    expect(getStoryShot(0.55)).toBe("loop-overview");
  });

  it("正向與反向查詢同一進度會得到完全相同狀態", () => {
    const forward = [0.12, 0.25, 0.34, 0.41, 0.55].map(getStoryState);
    const reverse = [0.55, 0.41, 0.34, 0.25, 0.12].map(getStoryState).reverse();
    expect(reverse).toEqual(forward);
  });

  it("水路總覽、供水與回水由章節進度得到穩定狀態", () => {
    expect(SYSTEM_ROUTE_PHASES.map((phase) => phase.id)).toEqual(["overview", "supply", "return"]);
    expect(getSystemRoutePhase("system", 0.2)).toBe("overview");
    expect(getSystemRoutePhase("system", 0.56)).toBe("supply");
    expect(getSystemRoutePhase("system", 0.62)).toBe("return");
    expect(getSystemRoute("unknown").id).toBe("overview");
    expect(getStoryState(getStoryProgress("system", 0.56)).systemRoutePhase).toBe("supply");
    expect(getStoryState(getStoryProgress("signals", 0.1)).systemRoutePhase).toBe("return");
  });

  it("降低動態仍保留目前水路狀態而不是固定到同一畫面", () => {
    for (const phase of SYSTEM_ROUTE_PHASES) {
      const progress = getStoryProgress("system", phase.localProgress);
      const stable = getStoryState(getStableStoryProgress(progress));
      expect(stable.scene).toBe("system");
      expect(stable.systemRoutePhase).toBe(phase.id);
    }
    expect(getStableStoryProgress(0.1)).toBe(0.12);
    expect(getStableStoryProgress(0.9)).toBe(0.94);
  });

  it("三個訊號區分觀察與否定安全敘述", () => {
    expect(SIGNALS.map((signal) => signal.id)).toEqual(["vibration", "temperature", "safety"]);
    expect(getSignal("safety").description).toContain("沒有洩漏、火花或焦味");
    expect(getSignal("unknown").id).toBe("vibration");
  });
});
