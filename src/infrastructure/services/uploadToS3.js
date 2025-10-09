import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * @param {string | object | object[]} source
 * @param {string} destinationFolder
 * @returns {Promise<string[]>} - uploaded S3 URLs
 */
export async function uploadToS3(source, destinationFolder = "audio") {
  const uploadedUrls = [];

  const getContentType = (ext) => {
    if ([".m3u8"].includes(ext)) return "application/x-mpegURL";
    if ([".ts"].includes(ext)) return "video/MP2T";
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return "image/jpeg";
    if ([".mp4", ".mov", ".mkv"].includes(ext)) return "video/mp4";
    if ([".mp3", ".wav"].includes(ext)) return "audio/mpeg";
    return "application/octet-stream";
  };

  let filesToUpload = [];

  if (Array.isArray(source)) {
    filesToUpload = source;
  }
  else if (typeof source === "object") {
    filesToUpload = [source];
  }
  else if (typeof source === "string") {
    const isDirectory = fs.lstatSync(source).isDirectory();
    const filePaths = isDirectory
      ? fs.readdirSync(source).map((f) => path.join(source, f))
      : [source];

    filesToUpload = filePaths.map((filePath) => ({
      path: filePath,
      name: path.basename(filePath),
    }));
  } else {
    throw new Error("Invalid source type. Must be local path or file object(s).");
  }

  for (const file of filesToUpload) {
    let fileBuffer;
    let fileName;

    if (file.toBuffer && typeof file.toBuffer === "function") {
      fileBuffer = await file.toBuffer();
      fileName = file.filename || file.name;
    }
    else if (file.buffer) {
      fileBuffer = file.buffer;
      fileName = file.originalname || file.name;
    }
    else if (file.path) {
      fileBuffer = fs.readFileSync(file.path);
      fileName = file.name || path.basename(file.path);
    }
    else {
      throw new Error("File object missing buffer, path, or toBuffer()");
    }

    const ext = path.extname(fileName).toLowerCase();
    const contentType = getContentType(ext);
    const s3Key = `${destinationFolder}/${fileName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );

    uploadedUrls.push(`${process.env.CLOUDFRONT_URL}/${s3Key}`);
  }

  return uploadedUrls;
}
