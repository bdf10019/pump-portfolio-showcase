import type { SignalId } from "./story-contract";

export type M1ProofId = "hero" | "system" | "mobile";

export type M1Proof = {
  id: M1ProofId;
  index: string;
  shortLabel: string;
  title: string;
  purpose: string;
  progress: number;
  signal: SignalId;
  viewport: string;
};

export const M1_PROOFS: ReadonlyArray<M1Proof> = [
  {
    id: "hero",
    index: "01",
    shortLabel: "桌機首屏",
    title: "先辨識同一台水泵",
    purpose: "編輯式大字與產品共享構圖，不遮擋泵殼、馬達與主要接管。",
    progress: 0.12,
    signal: "vibration",
    viewport: "1280 × 720",
  },
  {
    id: "system",
    index: "02",
    shortLabel: "水路總覽",
    title: "沿一條路徑理解系統",
    purpose: "先看總覽，再辨認水箱、水泵、換熱設備與回到起點的方向。",
    progress: 0.55,
    signal: "vibration",
    viewport: "1280 × 720",
  },
  {
    id: "mobile",
    index: "03",
    shortLabel: "手機構圖",
    title: "證據收斂仍然可操作",
    purpose: "直向單欄保留主角、三筆訊號、真實性標籤與主要動作。",
    progress: 0.94,
    signal: "temperature",
    viewport: "390 × 844",
  },
] as const;

export function getM1Proof(value: string | null | undefined): M1Proof {
  return M1_PROOFS.find((proof) => proof.id === value) ?? M1_PROOFS[0];
}
