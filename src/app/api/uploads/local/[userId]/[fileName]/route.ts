import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; fileName: string }> }
) {
  try {
    const { userId, fileName } = await params;
    const uploadDir = path.join("/var/www/clip/uploads", userId);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await request.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Local upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
