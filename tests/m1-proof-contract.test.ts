import { describe, expect, it } from "vitest";
import { M1_PROOFS, getM1Proof } from "../src/m1-proof-contract";

describe("M1 視覺證明契約", () => {
  it("只包含三個有界證明", () => {
    expect(M1_PROOFS.map((proof) => proof.id)).toEqual(["hero", "system", "mobile"]);
  });

  it("每個證明都有穩定進度、用途與視窗", () => {
    M1_PROOFS.forEach((proof) => {
      expect(proof.progress).toBeGreaterThanOrEqual(0);
      expect(proof.progress).toBeLessThanOrEqual(1);
      expect(proof.purpose.length).toBeGreaterThan(12);
      expect(proof.viewport).toMatch(/×/);
    });
  });

  it("未知證明安全回到桌機首屏", () => {
    expect(getM1Proof("unknown").id).toBe("hero");
  });
});
