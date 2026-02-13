import { createWorker } from "tesseract.js";
import sharp from "sharp";

let _worker: any = null;
let _initPromise: Promise<void> | null = null;

async function ensureWorker(lang = "eng") {
  if (_worker) return _worker;
  _worker = createWorker({ logger: () => null });
  _initPromise = (async () => {
    await _worker.load();
    await _worker.loadLanguage(lang);
    await _worker.initialize(lang);
  })();
  await _initPromise;
  return _worker;
}

export async function recognizeImage(buffer: Buffer, options?: { lang?: string; maxWidth?: number }) {
  const lang = options?.lang || "eng";
  const maxWidth = options?.maxWidth ?? 1600;

  // Preprocess with sharp: resize (no upscaling), grayscale and normalize for better OCR
  const image = sharp(buffer).resize({ width: Math.min(maxWidth, 2000), withoutEnlargement: true }).grayscale().normalise();
  const processed = await image.toBuffer();

  const worker = await ensureWorker(lang);
  const { data } = await worker.recognize(processed);
  return data?.text ?? "";
}

export async function terminateWorker() {
  if (_worker) {
    try {
      await _worker.terminate();
    } catch (e) {
      // ignore
    }
    _worker = null;
    _initPromise = null;
  }
}

export default { recognizeImage, terminateWorker };
