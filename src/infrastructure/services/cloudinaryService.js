import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "db5rtuzcw",
  api_key: process.env.CLOUDINARY_API_KEY || "492882652235184",
  api_secret: process.env.CLOUDINARY_API_SECRET || "zZgSetIFOe8rLykn_klFIKY153Y",
});

/**
 * @param {object} fileData
 * @param {string} folder
 * @returns {Promise<string>}
 */
export async function uploadToCloudinary(fileData, folder = "categories") {
  if (!fileData) throw new Error("No file data received");

  const buffer = await fileData.toBuffer();
  const ext = path.extname(fileData.filename || "").toLowerCase();

  let resourceType = "raw";
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    resourceType = "image";
  } else if (
    [".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav", ".ogg", ".flac", ".mpa"].includes(ext)
  ) {
    resourceType = "video"; 
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}-${fileData.filename?.split(".")[0] || "file"}`,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
