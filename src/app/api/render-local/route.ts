import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

const UPLOAD_DIR = "/var/www/clip/uploads";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { design } = body;

    if (!design || !design.tracks || !design.trackItemsMap) {
      return NextResponse.json(
        { message: "Invalid design data" },
        { status: 400 }
      );
    }

    // Extract video items from all tracks, in order
    const videoItems: Array<{
      src: string;
      filePath: string;
      trimFrom: number;
      trimTo: number;
      itemId: string;
    }> = [];

    for (const track of design.tracks) {
      for (const itemId of track.items) {
        const item = design.trackItemsMap[itemId];
        if (!item) continue;

        if (item.type === "video" && item.details?.src) {
          const srcUrl = item.details.src;
          let filePath = await resolveFilePath(srcUrl);

          videoItems.push({
            src: srcUrl,
            filePath,
            trimFrom: item.trim?.from || 0,
            trimTo: item.trim?.to || item.duration || 30,
            itemId: item.id,
          });
        }
      }
    }

    if (videoItems.length === 0) {
      return NextResponse.json(
        { message: "No video items found in design" },
        { status: 400 }
      );
    }

    // Check files exist
    for (const v of videoItems) {
      try {
        await fs.access(v.filePath);
      } catch {
        return NextResponse.json(
          { message: `Source file not found: ${v.filePath}` },
          { status: 400 }
        );
      }
    }

    // Generate output filename
    const outputId = randomUUID();
    const outputFileName = `${outputId}.mp4`;
    const outputPath = path.join(UPLOAD_DIR, outputFileName);

    // Build FFmpeg command
    const size = design.size || { width: 1920, height: 1080 };

    // For simple single video or concatenation
    if (videoItems.length === 1) {
      const v = videoItems[0];
      const trimStart = v.trimFrom / 1000; // ms to seconds
      const trimDuration = (v.trimTo - v.trimFrom) / 1000;

      const args = [
        "-ss", String(trimStart),
        "-i", v.filePath,
        "-t", String(trimDuration),
        "-vf", `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-y",
        outputPath,
      ];

      await runFfmpeg(args);
    } else {
      // Multiple clips: concat with trimming
      // Create temp files for each trimmed segment
      const tempDir = path.join("/tmp", outputId);
      await fs.mkdir(tempDir, { recursive: true });

      const concatFile = path.join(tempDir, "concat.txt");
      const concatLines: string[] = [];

      for (let i = 0; i < videoItems.length; i++) {
        const v = videoItems[i];
        const trimStart = v.trimFrom / 1000;
        const trimDuration = (v.trimTo - v.trimFrom) / 1000;
        const tempFile = path.join(tempDir, `seg_${i}.mp4`);

        const args = [
          "-ss", String(trimStart),
          "-i", v.filePath,
          "-t", String(trimDuration),
          "-vf", `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2`,
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "23",
          "-c:a", "aac",
          "-y",
          tempFile,
        ];

        await runFfmpeg(args);
        concatLines.push(`file '${tempFile}'`);
      }

      await fs.writeFile(concatFile, concatLines.join("\n"));

      // Concat all segments
      const concatArgs = [
        "-f", "concat",
        "-safe", "0",
        "-i", concatFile,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-c:a", "aac",
        "-y",
        outputPath,
      ];

      await runFfmpeg(concatArgs);

      // Cleanup temp files
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    // Return the download URL
    const downloadUrl = `/uploads/${outputFileName}`;

    return NextResponse.json({
      render: {
        id: outputId,
        status: "COMPLETED",
        progress: 100,
        presigned_url: downloadUrl,
      },
    });
  } catch (error: any) {
    console.error("Render error:", error);
    return NextResponse.json(
      { message: error.message || "Render failed" },
      { status: 500 }
    );
  }
}

async function resolveFilePath(srcUrl: string): Promise<string> {
  const candidates: string[] = [];

  // 1. /api/uploads/local/{userId}/{fileName}
  if (srcUrl.startsWith("/api/uploads/local/")) {
    const parts = srcUrl.replace("/api/uploads/local/", "").split("/");
    candidates.push(path.join(UPLOAD_DIR, ...parts));
  }

  // 2. /uploads/{userId}/{fileName} or /uploads/{fileName}
  if (srcUrl.startsWith("/uploads/")) {
    candidates.push(path.join(UPLOAD_DIR, srcUrl.replace("/uploads/", "")));
  }

  // 3. Absolute path
  if (srcUrl.startsWith("/var/www/")) {
    candidates.push(srcUrl);
  }

  // 4. Just the filename (last segment)
  const fileName = srcUrl.split("/").pop() || "";
  if (fileName) {
    // Try root of uploads
    const rootPath = path.join(UPLOAD_DIR, fileName);
    if (!candidates.includes(rootPath)) {
      candidates.push(rootPath);
    }
    // Try all subdirectories
    try {
      const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(UPLOAD_DIR, entry.name, fileName);
          candidates.push(subPath);
        }
      }
    } catch {}
  }

  // 5. Raw URL path (handle blob: or http: URLs that might have useful filenames)
  if (srcUrl.includes("/") && !srcUrl.startsWith("/")) {
    const lastSeg = srcUrl.split("/").pop() || "";
    if (lastSeg && lastSeg !== fileName) {
      candidates.push(path.join(UPLOAD_DIR, lastSeg));
    }
  }

  // Return the first candidate that exists
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  // If no candidate was found and src looks like a blob or data URL, it can't be resolved
  if (srcUrl.startsWith("blob:") || srcUrl.startsWith("data:")) {
    throw new Error(`Cannot resolve blob/data URL to local file. Ensure videos are uploaded via the upload API first. Src: ${srcUrl.substring(0, 80)}`);
  }

  // Return the first candidate for a helpful error message
  return candidates[0] || path.join(UPLOAD_DIR, fileName);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    ffmpeg.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exit code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}
