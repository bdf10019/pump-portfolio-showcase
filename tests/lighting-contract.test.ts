import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const contract = JSON.parse(
  readFileSync(resolve("public/assets/pump-core-v1/pump-lighting-contract-v1.json"), "utf8"),
);

describe("pump-lighting-contract-v1", () => {
  it("固定六個可逆場景光位", () => {
    expect(Object.keys(contract.scenes)).toEqual([
      "curtain",
      "system",
      "anomaly",
      "isolated",
      "exploded",
      "reassembled",
    ]);
  });

  it("滑鼠跟隨維持在計畫範圍", () => {
    expect(contract.pointerFollow.keyAzimuthRange).toBe(12);
    expect(contract.pointerFollow.keyElevationRange).toBe(6);
    expect(contract.pointerFollow.modelParallaxDegrees).toBeLessThanOrEqual(2.5);
  });

  it("材質輸出使用線性工作空間、sRGB 與 ACES", () => {
    expect(contract.colorManagement.working).toBe("Linear-sRGB");
    expect(contract.colorManagement.output).toBe("sRGB");
    expect(contract.colorManagement.toneMapping).toBe("ACESFilmic");
  });
});
