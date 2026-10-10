import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createPumpModel, type PumpContract } from "../src/pump";

const contract = JSON.parse(
  readFileSync(resolve("public/assets/pump-core-v1/pump-core-parts-v1.json"), "utf8"),
) as PumpContract;

describe("PUMP-CORE-ASSET-01", () => {
  it("固定十一個唯一零件節點", () => {
    const ids = contract.parts.map((part) => part.id);
    expect(ids).toHaveLength(11);
    expect(new Set(ids).size).toBe(11);
    expect(ids).toEqual([
      "volute",
      "impeller",
      "shaft",
      "bearing_front",
      "bearing_rear",
      "mechanical_seal",
      "coupling",
      "motor",
      "baseplate",
      "sensor_vibration",
      "sensor_temperature",
    ]);
  });

  it("每個零件都有有限爆炸向量與真實性說明", () => {
    contract.parts.forEach((part) => {
      expect(part.explode).toHaveLength(3);
      expect(part.explode.every(Number.isFinite)).toBe(true);
      expect(part.function.length).toBeGreaterThan(4);
      expect(part.signal.length).toBeGreaterThan(4);
      expect(part.truth.length).toBeGreaterThan(4);
    });
  });

  it("程序模型建立相同的具名節點並可逆拆解", () => {
    const model = createPumpModel(contract, "mobile");
    expect(model.root.name).toBe("pump_root");
    expect(model.parts.size).toBe(11);
    contract.parts.forEach((part) => expect(model.root.getObjectByName(part.id)).toBeTruthy());

    model.setExplode(1);
    const exploded = contract.parts.map((part) => model.parts.get(part.id)?.position.toArray());
    expect(exploded.some((position) => position?.some((value) => value !== 0))).toBe(true);

    model.setExplode(0);
    contract.parts.forEach((part) => expect(model.parts.get(part.id)?.position.toArray()).toEqual([0, 0, 0]));
    model.dispose();
  });

  it("交付 GLB 具有有效標頭且不是空白占位檔", () => {
    const glb = readFileSync(resolve("public/assets/pump-core-v1/pump-core-source-v1.glb"));
    expect(glb.subarray(0, 4).toString("ascii")).toBe("glTF");
    expect(glb.readUInt32LE(4)).toBe(2);
    expect(glb.readUInt32LE(8)).toBe(glb.byteLength);
    expect(glb.byteLength).toBeGreaterThan(100_000);
  });
});
