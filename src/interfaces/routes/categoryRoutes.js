import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { CategoryRepository } from "../../infrastructure/databases/postgres/categoryRepository.js";
import { CategoryUsecase } from "../../domain/usecases/categoryUsecase.js";
import { CategoryController } from "../controllers/categoryController.js";
import fastifyMultipart from "@fastify/multipart";
import {uploadToCloudinary  } from "../../infrastructure/services/cloudinaryService.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const categoryRoutes = async (app, { prismaRepository }) => {
  const repo = new CategoryRepository(prismaRepository.prisma);
  const usecase = new CategoryUsecase(repo);
  const controller = new CategoryController(usecase);

  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 2
    },
    attachFieldsToBody: true
  });

 app.post("/", async (req, reply) => {
  try {
    const { name, backgroundImage, icon,color} = req.body;

    let backgroundImageUrl = null;
    let iconUrl = null;

    if (backgroundImage?.file) {
      backgroundImageUrl = await uploadToCloudinary(
        backgroundImage,
        "categories/backgrounds"
      );
    } else if (typeof backgroundImage === "string" && backgroundImage.trim() !== "") {
      backgroundImageUrl = backgroundImage;
    }

    if (icon?.file) {
      iconUrl = await uploadToCloudinary(icon, "categories/icons");
    } else if (typeof icon === "string" && icon.trim() !== "") {
      iconUrl = icon;
    }

    const payload = {
      name: typeof name === "object" ? name.value : name,
      backgroundImage: backgroundImageUrl,
      icon: iconUrl,
      color:typeof color === "object" ? color.value : color,
    };

    await controller.create({ ...req, body: payload }, reply);
  } catch (error) {
    console.error("Form data processing error:", error);
    reply
      .status(500)
      .send({ error: "Failed to process form data", details: error.message });
  }
});


  app.patch("/:id", async (req, reply) => {
    try {
      const { name, backgroundImage, icon } = req.body;

      let backgroundImageUrl = null;
      let iconUrl = null;

      if (backgroundImage?.file) {
        backgroundImageUrl = await saveUploadedFile(backgroundImage);
      } else if (typeof backgroundImage === "string") {
        backgroundImageUrl = backgroundImage;
      }

      if (icon?.file) {
        iconUrl = await saveUploadedFile(icon);
      } else if (typeof icon === "string") {
        iconUrl = icon;
      }

      req.body = {
        ...(name && { name: typeof name === "object" ? name.value : name }),
        ...(backgroundImageUrl && { backgroundImage: backgroundImageUrl }),
        ...(iconUrl && { icon: iconUrl })
      };

      await controller.update(req, reply);
    } catch (error) {
      console.error("Update form data processing error:", error);
      reply
        .status(500)
        .send({ error: "Failed to process update form data", details: error.message });
    }
  });

  app.get("/", (req, reply) => controller.getAll(req, reply));
  app.get("/:id", (req, reply) => controller.getById(req, reply));
  app.delete("/:id", (req, reply) => controller.delete(req, reply));
};

async function saveUploadedFile(fileData) {
  try {
    const buffer = await fileData.toBuffer(); 
    const filename = `${Date.now()}-${fileData.filename}`;
    const uploadDir = path.join(__dirname, "../../uploads");

    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    await fs.writeFile(path.join(uploadDir, filename), buffer);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error("File save error:", error);
    throw new Error("Failed to save uploaded file");
  }
}
