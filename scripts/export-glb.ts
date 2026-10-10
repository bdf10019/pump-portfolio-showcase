import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createPumpModel, type PumpContract } from "../src/pump-detailed.ts";

class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: ((event: { target: NodeFileReader }) => void) | null = null;

  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.({ target: this });
    });
  }

  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.({ target: this });
    });
  }
}

Object.assign(globalThis, { FileReader: NodeFileReader });

const root = resolve(import.meta.dirname, "..");
const contractPath = resolve(root, "public/assets/pump-core-v1/pump-core-parts-v1.json");
const outputPath = resolve(root, "public/assets/pump-core-v1/pump-core-detailed-v2.glb");
const contract = JSON.parse(await readFile(contractPath, "utf8")) as PumpContract;
const pump = createPumpModel(contract, "desktop");
const exporter = new GLTFExporter();

try {
  const result = await exporter.parseAsync(pump.root, { binary: true, onlyVisible: true });
  if (!(result instanceof ArrayBuffer)) throw new Error("預期匯出 GLB 二進位資料");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(result));
  console.log(`已建立 ${outputPath} (${result.byteLength.toLocaleString("en-US")} bytes)`);
} finally {
  pump.dispose();
}
