import { initializeMailer } from "../../config/mail.js";

export class NotificationService {
  constructor() {
    this.mailer = initializeMailer();
  }

  async sendEmail(to, subject, text, html) {
    const mailOptions = {
      from: '"App Support" <no-reply@yourapp.com>',
      to,
      subject,
      text,
      html,
    };
    await this.mailer.sendMail(mailOptions);
  }

  async sendPushNotification(fcmToken, title, body) {
    if (!fcmToken) {
      // console.log("⚠️ No FCM Token provided for push notification.");
      return;
    }

    // TODO: Integrate Firebase Admin SDK or other provider here.
    // For now, we simulate sending a push notification.
    console.log(
      `📱 [MOCK PUSH] To: ${fcmToken.substring(0, 10)}... | Title: ${title} | Body: ${body}`,
    );

    // Simulate async network call
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
