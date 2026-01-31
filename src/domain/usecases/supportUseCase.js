import { NotificationService } from "../../infrastructure/services/notificationService.js";

export class SupportUseCase {
  constructor(supportRepository) {
    this.supportRepository = supportRepository;
    this.notificationService = new NotificationService();
  }

  async createSupportDevice(data) {
    const { subject, message, image, userEmail } = data;

    // Save to DB (optional/mock)
    await this.supportRepository.createSupportTicket({
      subject,
      message,
      userEmail,
      hasAttachment: !!image,
    });

    // Prepare Email
    const mailTo = process.env.MAIL_USER;
    const emailSubject = `Support Request: ${subject}`;
    const emailText = `New support request from: ${userEmail}\n\nMessage:\n${message}`;
    const emailHtml = `
      <h3>New Support Request</h3>
      <p><strong>From:</strong> ${userEmail}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `;

    const attachments = [];
    if (image) {
      // Assuming image is the object from fastify-multipart
      // fastify-multipart adds a .toBuffer() method to the file object
      const buffer = await image.toBuffer();
      attachments.push({
        filename: image.filename,
        content: buffer,
        contentType: image.mimetype,
      });
    }

    // Send Email
    await this.notificationService.sendEmail(
      mailTo,
      emailSubject,
      emailText,
      emailHtml,
      attachments,
    );

    return { success: true, message: "Support request sent successfully" };
  }
}
