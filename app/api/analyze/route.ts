import { NextResponse } from "next/server";
import { YouCamUserError, analyzeSkin } from "@/lib/youcam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'image' file field." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 413 });
    }
    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const analysis = await analyzeSkin({ imageBytes, fileName: file.name, fileSize: file.size, contentType: file.type });
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof YouCamUserError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Skin analysis failed." }, { status: 500 });
  }
}
