import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

interface PresignRequest {
  userId: string;
  fileNames: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: PresignRequest = await request.json();
    const { userId, fileNames } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json(
        { error: "fileNames array is required and must not be empty" },
        { status: 400 }
      );
    }

    const uploadDir = path.join("/var/www/clip/uploads", userId);
    await mkdir(uploadDir, { recursive: true });

    const uploads = fileNames.map((fileName) => {
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = `/uploads/${userId}/${safeName}`;

      return {
        fileName: safeName,
        filePath: filePath,
        contentType: getContentType(fileName),
        presignedUrl: `/api/uploads/local/${userId}/${safeName}`,
        folder: null,
        url: filePath,
      };
    });

    return NextResponse.json({
      success: true,
      uploads: uploads,
    });
  } catch (error) {
    console.error("Error in presign route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function getContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
  };
  return types[ext || ""] || "application/octet-stream";
}
