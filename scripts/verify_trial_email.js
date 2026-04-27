import { SubscriptionUseCases } from "../src/domain/usecases/subscriptionUseCases.js";

// Mock Dependencies
const mockSubscriptionRepo = {
  findPlanById: async () => ({
    id: "plan_123",
    name: "Premium Monthly",
    price: 9.99,
    currency: "USD",
    interval: "month",
    intervalCount: 1,
    trialDays: 7,
  }),
  findActiveSubscriptionByUserId: async () => null,
  updateUserStripeCustomerId: async () => {},
  createTransaction: async () => {},
  deleteSubscription: async () => {},
  createSubscription: async () => {},
  updateSubscription: async () => {},
};

const mockUserRepo = {
  findById: async () => ({
    id: "user_123",
    email: "test@example.com",
    name: "Test User",
    stripeCustomerId: "cus_123",
  }),
  updateUserSubscriptionType: async () => {},
};

const mockStripeService = {
  createOrGetCustomer: async () => ({ id: "cus_123" }),
  stripe: {
    customers: {
      update: async () => ({ name: "Test User", address: {} }),
    },
    products: {
      create: async () => ({ id: "prod_123" }),
    },
    subscriptions: {
      create: async () => ({
        id: "sub_123",
        current_period_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        current_period_start: Math.floor(Date.now() / 1000),
        latest_invoice: { payment_intent: { client_secret: "secret" } },
      }),
    },
  },
};

const mockMailer = {
  sendMail: async (options) => {
    console.log("--- Mock Mailer Output ---");
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    console.log("Content (Snippet):", options.html.substring(0, 100));
    console.log("--------------------------");
    return true;
  },
};

async function verifyTrialEmail() {
  console.log("Initializing SubscriptionUseCases with Mock Mailer...");
  const useCase = new SubscriptionUseCases(
    mockSubscriptionRepo,
    mockUserRepo,
    mockStripeService,
    mockMailer,
  );

  console.log("Simulating App Checkout with Trial Plan...");
  try {
    const result = await useCase.createAppSubscriptionCheckout(
      "user_123",
      "plan_123",
    );
    console.log("Checkout Result:", result.message);
    console.log(
      "✅ Verification Successful if Mock Mailer Output appears above.",
    );
  } catch (error) {
    console.error("❌ Verification Failed:", error);
  }
}

verifyTrialEmail();
