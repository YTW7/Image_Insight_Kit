import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import "@tensorflow/tfjs-backend-wasm";
import * as mobilenet from "@tensorflow-models/mobilenet";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { logAnalyzedImage } from "@/lib/aws";

interface ClassifyResponse {
  predictions: { className: string; probability: number }[];
}
interface ErrorResponse {
  error: string;
}

const globalWithModel = global as typeof global & {
  mobilenetModel?: mobilenet.MobileNet;
  tfReady?: boolean;
};

async function getModel(): Promise<mobilenet.MobileNet> {
  if (!globalWithModel.tfReady) {
    tf.enableProdMode();
    const wasmDir = path.join(process.cwd(), "public/wasm/");
    setWasmPaths(`file://${wasmDir}`);
    await tf.setBackend("wasm");
    await tf.ready();
    globalWithModel.tfReady = true;
  }
  if (!globalWithModel.mobilenetModel) {
    // NOTE: fetches weights from TF Hub on first load (needs internet once).
    // For fully offline demo, download weights locally and pass modelUrl here instead.
    globalWithModel.mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
  }
  return globalWithModel.mobilenetModel;
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
function corsHeaders(origin: string | null): HeadersInit {
  const allowed = ALLOWED_ORIGINS.length === 0 || (origin && ALLOWED_ORIGINS.includes(origin));
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

async function bufferFromRequest(req: NextRequest): Promise<Buffer> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) throw new Error("No image uploaded");
    if (!file.type.startsWith("image/")) throw new Error("Invalid file type");
    return Buffer.from(await file.arrayBuffer());
  }
  throw new Error("Use multipart/form-data with an 'image' field");
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ClassifyResponse | ErrorResponse>> {
  const headers = corsHeaders(req.headers.get("origin"));
  try {
    const buffer = await bufferFromRequest(req);
    const model = await getModel();

    const { data, info } = await sharp(buffer)
      .resize(224, 224)
      .removeAlpha()
      .toColorspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imageTensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);

    let predictions;
    try {
      predictions = await model.classify(imageTensor, 5); // top 5
    } finally {
      imageTensor.dispose();
    }
    try {
      await logAnalyzedImage(buffer, "upload.jpg", predictions);
    } catch (s3Err) {
      console.warn("S3 logging skipped:", s3Err instanceof Error ? s3Err.message : s3Err);
    }

    return NextResponse.json({ predictions }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Classification failed";
    console.error("Classify error:", error);
    return NextResponse.json({ error: message }, { status: 500, headers });
  }
}