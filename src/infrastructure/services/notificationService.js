import { initializeMailer } from "../../config/mail.js";

export class NotificationService {
  constructor() {
    this.mailer = initializeMailer();
  }

  async sendEmail(to, subject, text, html, attachments = []) {
    const mailOptions = {
      from: '"App Support" <no-reply@yourapp.com>',
      to,
      subject,
      text,
      html,
      attachments,
    };
    await this.mailer.sendMail(mailOptions);
  }

  async sendPushNotification(fcmToken, title, body) {
    if (!fcmToken) {
      return;
    }

    console.log(
      `📱 [MOCK PUSH] To: ${fcmToken.substring(0, 10)}... | Title: ${title} | Body: ${body}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
