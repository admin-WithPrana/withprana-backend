import PDFDocument from "pdfkit";
import { prisma } from "../config/database.js";
import { uploadToS3 } from "../infrastructure/services/uploadToS3.js";

/**
 * Generate PDF for last 30 days and upload to S3
 * @param {string} userId
 * @param {string} destinationFolder S3 folder
 * @returns {Promise<string>} S3 URL of the PDF
 */
export async function generateAndUploadLogsPDF(userId, destinationFolder = "reports") {
    try {
        // 1️⃣ Calculate 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 2️⃣ Fetch login history
        const loginHistory = await prisma.loginHistory.findMany({
            where: { userId, loggedInAt: { gte: thirtyDaysAgo } },
            orderBy: { loggedInAt: "desc" },
        });

        // 3️⃣ Fetch meditation watch history
        const meditationHistory = await prisma.meditationWatchHistory.findMany({
            where: { userId, watchedAt: { gte: thirtyDaysAgo } },
            orderBy: { watchedAt: "desc" },
        });

        // 4️⃣ Create PDF in memory
        const doc = new PDFDocument({ margin: 30 });
        const buffers = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => { });

        // Heading
        doc.fontSize(20).text("User Activity Report - Last 30 Days", { align: "center" });
        doc.moveDown(2);

        // -------- Login History Table --------
        doc.fontSize(16).text("Login History", { underline: true });
        doc.moveDown(0.5);

        if (loginHistory.length === 0) {
            doc.fontSize(12).text("No login activity in the last 30 days");
        } else {
            loginHistory.forEach((log, index) => {
                doc.fontSize(12).text(
                    `${index + 1}. Logged In: ${log.loggedInAt.toISOString()} | Logged Out: ${log.loggedOutAt ? log.loggedOutAt.toISOString() : "N/A"} | Device: ${log.device || "N/A"}`
                );
            });
        }

        doc.moveDown(2);

        // -------- Meditation Watch History Table --------
        doc.fontSize(16).text("Meditation Watch History", { underline: true });
        doc.moveDown(0.5);

        if (meditationHistory.length === 0) {
            doc.fontSize(12).text("No meditation activity in the last 30 days");
        } else {
            meditationHistory.forEach((med, index) => {
                doc.fontSize(12).text(
                    `${index + 1}. Meditation ID: ${med.meditationId} | Watched At: ${med.watchedAt.toISOString()} | Seconds Watched: ${med.watchedSeconds || 0} | Completed: ${med.completed}`
                );
            });
        }

        doc.end();

        // 5️⃣ Convert PDF to buffer
        const pdfBuffer = await new Promise((resolve, reject) => {
            const resultBuffers = [];
            doc.on("data", (chunk) => resultBuffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(resultBuffers)));
            doc.on("error", (err) => reject(err));
        });

        // 6️⃣ Upload to S3
        const s3Urls = await uploadToS3(
            { buffer: pdfBuffer, name: `user-${userId}-last30days.pdf` },
            destinationFolder
        );

        return s3Urls[0]; // Return the S3 URL
    } catch (error) {
        console.log(error)
    }
}
