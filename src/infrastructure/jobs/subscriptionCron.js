import cron from "node-cron";
export const initializeSubscriptionCron = (prisma, mailer) => {
  cron.schedule("0 0 * * *", async () => {
    console.log("⏳ Running subscription expiry check...");

    try {
      const today = new Date();

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfDay = new Date(tomorrow);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(tomorrow);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(
        `🔎 Checking for subscriptions ending between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`,
      );

      const BATCH_SIZE = 100;
      let cursor = null;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {

        const query = {
          where: {
            status: { in: ["ACTIVE", "TRIALING"] },
            currentPeriodEnd: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            plan: {
              select: {
                name: true,
              },
            },
          },
          take: BATCH_SIZE,
          orderBy: {
            id: "asc",
          },
        };

        if (cursor) {
          query.cursor = { id: cursor };
          query.skip = 1;
        }

        const subscriptions = await prisma.subscription.findMany(query);

        if (subscriptions.length === 0) {
          hasMore = false;
          break;
        }

        console.log(
          `Processing batch of ${subscriptions.length} subscriptions...`,
        );

        const emailPromises = subscriptions.map(async (sub) => {
          if (sub.user && sub.user.email) {
            try {
              const userName = sub.user.name || "Valued User";
              const planName = sub.plan ? sub.plan.name : "Subscription";
              const endDate = new Date(
                sub.currentPeriodEnd,
              ).toLocaleDateString();

              await mailer.sendMail({
                from:
                  process.env.MAIL_FROM || '"Being One Within" <no-reply@beingonewithin.app>',
                to: sub.user.email,
                subject: "Your Subscription is Ending Soon",
                text: `Hello ${userName},\n\nYour subscription to ${planName} is scheduled to end tomorrow (${endDate}).\n\nPlease renew your subscription to continue enjoying our premium features.\n\nBest regards,\nBeing One Within Team`,
                html: `
                  <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Subscription Expiry Notice</h2>
                    <p>Hello <strong>${userName}</strong>,</p>
                    <p>Your subscription to <strong>${planName}</strong> is scheduled to end tomorrow (<strong>${endDate}</strong>).</p>
                    <p>Please renew your subscription to continue enjoying our premium features without interruption.</p>
                    <br/>
                    <p>Best regards,<br>The Being One Within Team</p>
                  </div>
                `,
              });
            } catch (emailError) {
              console.error(
                `❌ Failed to send email to ${sub.user.email} (User ID: ${sub.user.id}):`,
                emailError,
              );
            }
          }
        });

        await Promise.all(emailPromises);

        totalProcessed += subscriptions.length;
        if (subscriptions.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          cursor = subscriptions[subscriptions.length - 1].id;
        }
      }

      console.log(
        `✅ Subscription expiry check completed. Processed ${totalProcessed} subscriptions.`,
      );
    } catch (error) {
      console.error("❌ Error during subscription expiry cron job:", error);
    }
  });
};
