import { SSEService } from '../src/infrastructure/services/sseService.js';

console.log("=== Stripe SSE Notification Emulator Test ===\n");

// 1. Initialize our service instance
const sse = new SSEService();

// 2. Mock a user connecting to the Fastify route
let receivedEvents = [];

const mockReq = {
  raw: {
    on: (eventName, cb) => {
      if (eventName === 'close') {
        console.log(`[Mock] Connection listener added for: ${eventName}`);
      }
    }
  }
};

const mockReply = {
  raw: {
    writeHead: (code, headers) => {
      console.log("[Mock Fastify Server] Setting SSE Headers:", code);
    },
    write: (data) => {
      console.log(`[Mock Client Receiver] Received Chunk:\n${data}---`);
      receivedEvents.push(data);
    }
  }
};

const userId = "USER-999";

console.log(`➤ Step 1: Client '${userId}' connects to /api/subscriptions/sse/subscribe`);

// Emulate Controller Flow:
mockReply.raw.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*'
});
mockReply.raw.write(`retry: 10000\n\n`);

sse.addClient(userId, mockReply);
mockReq.raw.on('close', () => sse.removeClient(userId, mockReply));


console.log(`\n➤ Step 2: Stripe webhook (invoice.payment_succeeded) hits backend...`);
// Emulate the UseCase Flow once the database updates successfully:
console.log("[Mock UseCase] Database Subscription Active & Records Updated.");
console.log(`[Mock UseCase] Emitting 'payment_success' to user '${userId}'...`);

sse.sendEventToUser(userId, "payment_success", {
  message: "Subscription payment succeeded",
  amount: 29.99,
  currency: "usd"
});


console.log(`\n➤ Step 3: Verifying connection drop / page close...`);
// User closes the page
sse.removeClient(userId, mockReply);


console.log("\n=== Test Results ===");
const dataSentCorrectly = receivedEvents.find(e => e.includes('event: payment_success'));
if (dataSentCorrectly) {
  console.log("✅ SUCCESS: The Server-Sent Event was properly formatted and broadcast to the specific user's connection!");
} else {
  console.log("❌ FAILED: Event not received or incorrectly formatted.");
  process.exit(1);
}
