import { initializeMailer } from "../../config/mail.js";

export class NotificationService {
  constructor() {
    this.mailer = initializeMailer();
    this.fromEmail =
      process.env.MAIL_FROM ||
      '"Being One Within" <no-reply@beingonewithin.app>';
  }

  async sendEmail(to, subject, text, html, attachments = []) {
    try {
      const mailOptions = {
        from: this.fromEmail,
        to,
        subject,
        text,
        html,
        attachments,
      };
      await this.mailer.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to} | Subject: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      // We don't throw here to prevent disrupting the main flow, unless critical
    }
  }

  async sendPushNotification(fcmToken, title, body) {
    if (!fcmToken) return;
    console.log(
      `📱 [MOCK PUSH] To: ${fcmToken.substring(0, 10)}... | Title: ${title} | Body: ${body}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // --- 1. Signup Confirmation / Welcome ---
  async sendWelcomeEmail(user) {
    const subject = "Welcome to Being One Within! 🌿";
    const text = `Hi ${user.name || "there"},\n\nWelcome to Being One Within! We're thrilled to have you join our community.\n\nStart your journey to mindfulness today.\n\nBest regards,\nThe Being One Within Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Welcome to Being One Within! 🌿</h2>
        <p>Hi ${user.name || "there"},</p>
        <p>We're thrilled to have you join our community of mindfulness and growth.</p>
        <p>Explore our guided meditations, music, and wisdom to start your journey today.</p>
        <br/>
        <p>Best regards,<br>The Being One Within Team</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, text, html);
  }

  async sendOtpEmail(email, otpCode) {
    const subject = "OTP for verification";
    const text = `Your OTP is: ${otpCode}`;
    const html = `<p>Your OTP is: <strong>${otpCode}</strong></p>`;
    await this.sendEmail(email, subject, text, html);
  }

  // --- 2. Trial Emails ---
  async sendTrialStartedEmail(user, plan, trialEndDate) {
    const trialEnd = new Date(trialEndDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const amount = `${plan.currency.toUpperCase()} ${plan.price}`;

    const subject = "Welcome to Being One Within - Your Trial Details";
    const text = `Hi ${user.name || "there"},\n\nThank you for starting your free trial. Plan: ${plan.name}. Trial Ends: ${trialEnd}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Welcome to Being One Within! 🌿</h2>
        <p>Hi ${user.name || "there"},</p>
        <p>Thank you for starting your free trial. We're excited to have you on board!</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Trial Details</h3>
          <p><strong>Plan:</strong> ${plan.name}</p>
          <p><strong>Trial Starts:</strong> Today</p>
          <p><strong>Trial Ends:</strong> ${trialEnd}</p>
          <p><strong>Amount to be Billed After Trial:</strong> ${amount} / ${plan.interval}</p>
        </div>

        <p>You can cancel anytime before the trial ends to avoid being charged.</p>
        <p>Enjoy your journey to mindfulness!</p>
        
        <p>Best regards,<br>The Being One Within Team</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, text, html);
  }

  // --- 3. Subscription Emails ---
  async sendSubscriptionStartedEmail(user, plan, endDate) {
    const nextBilling = new Date(endDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const subject = "Your Subscription has Started! 🌟";
    const text = `Hi ${user.name || "there"},\n\nYour subscription to ${plan.name} is now active.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Subscription Active 🌟</h2>
        <p>Hi ${user.name || "there"},</p>
        <p>Your subscription to <strong>${plan.name}</strong> has successfully started.</p>
        <p>You now have full access to all premium features.</p>
        <p><strong>Next Billing Date:</strong> ${nextBilling}</p>
        <br/>
        <p>Thank you for choosing Being One Within.</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, text, html);
  }

  async sendSubscriptionEndingSoonEmail(user, plan, endDate) {
    const endStr = new Date(endDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const subject = "Your Subscription is Ending Soon";
    const text = `Hello ${user.name || "Valued User"},\n\nYour subscription to ${plan.name} is scheduled to end tomorrow (${endStr}).\nPlease renew to continue enjoying premium features.`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Subscription Expiry Notice</h2>
        <p>Hello <strong>${user.name || "Valued User"}</strong>,</p>
        <p>Your subscription to <strong>${plan.name}</strong> is scheduled to end tomorrow (<strong>${endStr}</strong>).</p>
        <p>Please renew your subscription to continue enjoying our premium features without interruption.</p>
        <br/>
        <p>Best regards,<br>The Being One Within Team</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, text, html);
  }

  // --- 4. Payment Emails ---
  async sendPaymentAcceptedEmail(user, amount, currency, invoiceUrl) {
    const subject = "Payment Receipt 🧾";
    const text = `Hi ${user.name || "there"},\n\nWe successfully received your payment of ${currency.toUpperCase()} ${amount}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Payment Received 🧾</h2>
        <p>Hi ${user.name || "there"},</p>
        <p>We successfully received your payment of <strong>${currency.toUpperCase()} ${amount}</strong>.</p>
        ${invoiceUrl ? `<p>You can view your invoice <a href="${invoiceUrl}">here</a>.</p>` : ""}
        <br/>
        <p>Thank you for your support!</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, text, html);
  }

  async sendPaymentDueEmail(user, plan, dueDate) {
    const dueStr = new Date(dueDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const subject = "Action Required: Payment Due ⚠️";
    const text = `Hi ${user.name || "there"},\n\nWe were unable to process your payment for ${plan.name}. Please update your payment method by ${dueStr}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Payment Due ⚠️</h2>
        <p>Hi ${user.name || "there"},</p>
        <p>We noticed that the payment for your <strong>${plan.name}</strong> subscription is due or failed.</p>
        <p>Please update your payment method to ensure uninterrupted access.</p>
        <br/>
        <p>Best regards,<br>The Being One Within Team</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, text, html);
  }

  // --- 5. Engagement & Account ---
  async sendInactivityEmail(user) {
    const subject = "We Miss You! 👋";
    const text = `Hi ${user.name || "there"},\n\nIt's been a while since we saw you. Come back and take a moment for yourself today.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>We Miss You! 👋</h2>
        <p>Hi ${user.name || "there"},</p>
        <p>It's been a while since you visited Being One Within.</p>
        <p>Taking just a few minutes a day for mindfulness can make a big difference.</p>
        <p>Come back and explore our new meditations.</p>
        <br/>
        <p>Hope to see you soon,<br>The Being One Within Team</p>
      </div>
    `;
    await this.sendEmail(user.email, subject, text, html);
  }

  async sendAccountDeleteConfirmationEmail(email, name) {
    const subject = "Account Deleted 🗑️";
    const text = `Hi ${name || "there"},\n\nYour account has been successfully deleted. We're sorry to see you go.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Account Deleted 🗑️</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your account has been successfully deleted as per your request.</p>
        <p>All your data has been removed from our systems.</p>
        <p>We're sorry to see you go and hope to welcome you back in the future.</p>
        <br/>
        <p>Best regards,<br>The Being One Within Team</p>
      </div>
    `;
    await this.sendEmail(email, subject, text, html);
  }
}
