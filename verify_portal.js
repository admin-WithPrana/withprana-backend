import { PrismaClient } from '@prisma/client';
import "dotenv/config";
import { StripeService } from './src/infrastructure/services/stripeService.js';
import { SubscriptionRepository } from './src/infrastructure/databases/postgres/SubscriptionRepository.js';
import { PrismaUserRepository } from './src/infrastructure/databases/postgres/userRepository.js';
import { SubscriptionUseCases } from './src/domain/usecases/subscriptionUseCases.js';

const prisma = new PrismaClient();
const stripeService = new StripeService();

async function main() {
  const subscriptionRepo = new SubscriptionRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const subscriptionUseCases = new SubscriptionUseCases(subscriptionRepo, userRepository, stripeService, null, null);

  console.log("1. Creating test user...");
  let user = await prisma.user.create({
    data: {
      email: "test_portal_user_" + Date.now() + "@example.com",
      name: "Test Portal User",
      signupMethod: "email"
    }
  });
  console.log(`User created: ${user.id}`);

  console.log("2. Creating Stripe Customer...");
  const customer = await stripeService.createCustomer(user);
  await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id }
  });
  console.log(`Stripe Customer ID: ${customer.id}`);

  console.log("3. Creating Test Plan in DB & Stripe...");
  const plan = await subscriptionUseCases.createPlan({
      name: "Test Plan " + Date.now(),
      price: 10,
      interval: "month",
      currency: "usd",
      trialDays: 0
  });
  console.log(`Plan created. Stripe Price ID: ${plan.stripePriceId}`);

  console.log("4. Creating active subscription record locally...");
  const sub = await prisma.subscription.create({
      data: {
          userId: user.id,
          planId: plan.id,
          stripeSubscriptionId: "sub_test_" + Date.now(),
          stripeCustomerId: customer.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
  });

  console.log("5. Generating Billing Portal Link...");
  try {
      const url = await subscriptionUseCases.generateBillingPortalLink(user.id, "https://example.com/success");
      console.log("\n✅ SUCCESS! Billing Portal URL generated:");
      console.log(url);
  } catch (error) {
      console.error("\n❌ FAILED to generate link:", error.message);
  }

  console.log("\n6. Cleaning up...");
  await prisma.subscription.delete({ where: { id: sub.id } });
  await prisma.subscriptionPlan.delete({ where: { id: plan.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Cleanup complete.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
