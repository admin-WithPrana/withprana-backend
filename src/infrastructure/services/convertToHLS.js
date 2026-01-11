import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import { promisify } from "util";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const mkdir = promisify(fs.mkdir);

/**
 * Converts a video/audio buffer into HLS format locally.
 * @param {Buffer} buffer - The uploaded file buffer
 * @returns {Promise<{ outputDir: string, manifestPath: string }>}
 */
export async function convertToHLS(buffer) {
  const tempInput = `temp-${Date.now()}.mp4`;
  const outputDir = path.join(process.cwd(), `hls-${Date.now()}`);
  const manifestPath = path.join(outputDir, "index.m3u8");

  fs.writeFileSync(tempInput, buffer);
  await mkdir(outputDir);

  await new Promise((resolve, reject) => {
    ffmpeg(tempInput)
      .addOptions([
        "-profile:v baseline",
        "-level 3.0",
        "-start_number 0",
        "-hls_time 6",
        "-hls_list_size 0",
        "-f hls",
      ])
      .output(manifestPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  fs.unlinkSync(tempInput); 
  return { outputDir, manifestPath };
}


export function removeFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`Folder removed: ${folderPath}`);
  } else {
    console.warn(`Folder does not exist: ${folderPath}`);
  }
}