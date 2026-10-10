import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../m1-proofs.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/m1-proofs.css", import.meta.url), "utf8");

describe("M1 視覺證明外殼", () => {
  it("提供三個可操作證明與正式入口返回連結", () => {
    expect(html.match(/data-proof-target=/g)).toHaveLength(3);
    expect(html).toContain("href=\"/?v=0.3.0-final\"");
    expect(html).toContain("aria-live=\"polite\"");
  });

  it("保留合成示意、非監控與非診斷邊界", () => {
    expect(html).toContain("合成示意");
    expect(html).toContain("不是即時監控或診斷");
  });

  it("具備手機、短視窗與降低動態編排", () => {
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("@media (max-height: 680px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
