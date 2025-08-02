import postgres from 'postgres';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { PostgresUserRepository } from '../infrastructure/databases/postgres/userRepository.js';
import { MongoUserRepository } from '../infrastructure/databases/mongo/userRepository.js';

dotenv.config();

let pgClient;
let mongoClient;

export const initializeDatabaseConnections = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    pgClient = postgres(connectionString, { idle_timeout: 20 });

    const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
    mongoClient = new MongoClient(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
    });

    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');

    return {
      pgClient,
      pgRepository: new PostgresUserRepository(pgClient),
      mongoRepository: new MongoUserRepository(mongoClient),
    };
  } catch (err) {
    console.error('❌ Database connection error:', err);
    throw err;
  }
};

export const closeDatabaseConnections = async () => {
  try {
    if (pgClient) {
      await pgClient.end({ timeout: 5 });
      console.log('✅ PostgreSQL connection closed');
    }

    if (mongoClient) {
      await mongoClient.close();
      console.log('✅ MongoDB connection closed');
    }
  } catch (err) {
    console.error('❌ Error closing connections:', err);
  }
};