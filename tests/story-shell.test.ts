import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");

describe("互動入口語意外殼", () => {
  it("包含前三幕、真實性揭露與工作台出口", () => {
    expect(html.match(/data-scene=/g)).toHaveLength(3);
    expect(html).toContain("合成情境 · 示意訊號 · 非設備控制");
    expect(html).toContain("/viewer.html");
  });

  it("所有訊號均為可操作按鈕並有靜態替代說明", () => {
    expect(html.match(/<button[^>]+data-signal=/g)).toHaveLength(3);
    expect(html).toContain("未發現危害跡象");
    expect(html).toContain("<noscript>");
  });

  it("入口只載入輕量協調器，3D 由程式延遲載入", () => {
    const story = readFileSync("src/story.ts", "utf8");
    expect(story).toContain('import("./story-scene")');
    expect(story).toContain('requestedMode === "static"');
    expect(story).toContain('requestedMode === "fallback"');
  });

  it("M2 只用一個模型實例並揭露章節內進度", () => {
    const story = readFileSync("src/story.ts", "utf8");
    const scene = readFileSync("src/story-scene.ts", "utf8");
    expect(scene.match(/createPumpModel\(/g)).toHaveLength(1);
    expect(scene).toContain('dataset.pumpInstances = "1"');
    expect(scene).toContain("dataset.shot = state.shot");
    expect(story).toContain('setProperty("--scene-progress"');
    expect(story).toContain("getStoryProgress(active.id, localProgress)");
  });

  it("正式入口採用 M1 核准的主角與環境路線文案", () => {
    expect(html).toContain("一台水泵");
    expect(html).toContain("貫穿整個流程");
    expect(html).toContain("ENVIRONMENTAL ROUTE · 02");
    expect(html).toContain("閉式循環閱讀順序");
    const manifest=JSON.parse(readFileSync('package.json','utf8'));
    expect(html).toContain(`data-version="${manifest.version}"`);
  });

  it("M3 提供三個水路狀態並讓訊號以單一交易同步", () => {
    const story = readFileSync("src/story.ts", "utf8");
    const scene = readFileSync("src/story-scene.ts", "utf8");
    expect(html.match(/data-route-phase=/g)).toHaveLength(5);
    expect(html).toContain("總覽");
    expect(html).toContain("供水");
    expect(html).toContain("回水");
    expect(story).toContain("updateSystemRoute(state.systemRoutePhase)");
    expect(story).toContain('querySelectorAll<HTMLButtonElement>("button[data-route-phase]")');
    expect(story).toContain("body.dataset.signal = id");
    expect(story).toContain('querySelectorAll<HTMLButtonElement>("button[data-signal]")');
    expect(scene).toContain("dataset.routePhase = state.systemRoutePhase");
    expect(scene).toContain("dataset.signal = signal");
  });

  it("M4 保留短視窗布局與可重現的初始化失敗模式", () => {
    const css = readFileSync("src/story.css", "utf8");
    const story = readFileSync("src/story.ts", "utf8");
    expect(css).toContain("@media (max-height: 600px) and (min-width: 821px)");
    expect(css).toContain("@media (max-height: 600px) and (max-width: 820px)");
    expect(story).toContain('simulated ? "simulated-fallback" : "fallback"');
    expect(story).toContain('poster.classList.remove("is-hidden")');
    expect(story).toContain('canvas.classList.remove("is-ready")');
  });

  it("D1 只在大型桌機套用展示構圖，不改寫手機斷點", () => {
    const css = readFileSync("src/story.css", "utf8");
    const scene = readFileSync("src/story-scene.ts", "utf8");
    expect(css).toContain("@media (min-width: 1100px) and (min-height: 700px)");
    expect(scene).toContain('window.matchMedia("(min-width: 1100px) and (min-height: 700px)")');
    expect(scene).toContain("desktopHeroWeight");
    expect(html).toContain("手機維持既有模型與排版");
  });

  it("D2 桌機訊號面板提供三步導讀且不改訊號契約", () => {
    const css = readFileSync("src/story.css", "utf8");
    expect(html).toContain('class="signal-workflow"');
    expect(html).toContain("先看觀察");
    expect(html).toContain("再比對脈絡");
    expect(html).toContain("最後保留限制");
    expect(css).toContain(".story-scene--signals { min-height: 118svh; }");
    expect(css).toContain(".signal-workflow { display: none; }");
    expect(html.match(/<button[^>]+data-signal=/g)).toHaveLength(3);
  });
});
