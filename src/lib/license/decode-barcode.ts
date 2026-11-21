"use client";

/**
 * Reads the PDF417 barcode on the back of a driver's license from a photo, entirely inside the
 * staff member's browser (the photo is not sent anywhere for reading), using the browser's
 * built-in BarcodeDetector. It is free and needs no extra packages. Chrome, Edge, and Chrome on
 * Android support it; Safari and Firefox do not yet, and then staff type the details in from the
 * photo shown next to the form.
 */

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorLike = {
  detect: (image: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

export type BarcodeReadResult =
  | { status: "ok"; text: string }
  | { status: "unsupported" }
  | { status: "not_found" }
  | { status: "bad_file"; message: string };

function detectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

/** Redraws the photo at a size and contrast that makes small PDF417 barcodes easier to find. */
async function enhanced(bitmap: ImageBitmap, maxSide: number, contrast: boolean): Promise<ImageBitmap | null> {
  const scale = Math.min(maxSide / Math.max(bitmap.width, bitmap.height), 2.5);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (contrast) ctx.filter = "grayscale(1) contrast(1.6)";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return createImageBitmap(canvas);
}

export async function readLicenseBarcode(source: Blob): Promise<BarcodeReadResult> {
  const Ctor = detectorCtor();
  if (!Ctor) return { status: "unsupported" };
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ["pdf417"];
    if (!formats.includes("pdf417")) return { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  }

  if (!source.type.startsWith("image/")) {
    return { status: "bad_file", message: "The back of the license must be a photo (JPG, PNG or WebP), not a PDF." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return { status: "bad_file", message: "That image could not be opened." };
  }

  const detector = new Ctor({ formats: ["pdf417"] });
  const attempts: Array<() => Promise<ImageBitmap | null>> = [
    async () => bitmap,
    () => enhanced(bitmap, 2400, false),
    () => enhanced(bitmap, 2400, true),
    () => enhanced(bitmap, 1400, true),
  ];
  for (const make of attempts) {
    try {
      const image = await make();
      if (!image) continue;
      const found = await detector.detect(image);
      const value = found.find((f) => f.rawValue)?.rawValue;
      if (value) return { status: "ok", text: value };
    } catch {
      // Try the next variant.
    }
  }
  return { status: "not_found" };
}
