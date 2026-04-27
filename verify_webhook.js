import { SubscriptionUseCases } from "./src/domain/usecases/subscriptionUseCases.js";

// --- MOCKS ---
const mockUser = {
  id: "user_123",
  email: "test@example.com",
  name: "Test User",
};
const mockPlan = { id: "plan_123", name: "Premium Monthly" };

const createMockRepo = (status) => ({
  findSubscriptionByStripeId: async (id) => ({
    id: "sub_123",
    userId: "user_123",
    planId: "plan_123",
    stripeSubscriptionId: id,
    status: status, // returns status based on input
    cancelAtPeriodEnd: false,
  }),
  updateSubscription: async (id, data) => {
    console.log(`[DB] Updated subscription ${id}:`, data);
  },
  findPlanById: async () => mockPlan,
  updateUserSubscriptionType: async () => {},
  findActiveSubscriptionByUserId: async () => null, // Not needed for this test
});

const mockUserRepo = {
  findById: async () => mockUser,
  updateUserSubscriptionType: async () => {},
};

const mockNotificationService = {
  sendTrialCancelledEmail: async () =>
    console.log("[EMAIL] Trial Cancelled SENT"),
  sendSubscriptionCancelledEmail: async () =>
    console.log("[EMAIL] Subscription Cancelled SENT"),
};

const mockStripeService = {};

// --- TEST CASES ---

async function testWebhook_AlreadyCanceled() {
  console.log("\n--- TEST: Webhook on ALREADY CANCELED ---");
  const repo = createMockRepo("CANCELED");
  const useCase = new SubscriptionUseCases(
    repo,
    mockUserRepo,
    mockStripeService,
    mockNotificationService,
  );

  // Should NOT send email
  await useCase.handleSubscriptionDeleted({ id: "sub_std_123" });
}

async function testWebhook_TrialExpiracy() {
  console.log("\n--- TEST: Webhook on TRIAL Expiry (status TRIALING) ---");
  const repo = createMockRepo("TRIALING");
  const useCase = new SubscriptionUseCases(
    repo,
    mockUserRepo,
    mockStripeService,
    mockNotificationService,
  );

  // Should send TRIAL email
  await useCase.handleSubscriptionDeleted({ id: "sub_std_123" });
}

async function run() {
  await testWebhook_AlreadyCanceled();
  await testWebhook_TrialExpiracy();
}

run();
