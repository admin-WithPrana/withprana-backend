// src/config/database.js
import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { PrismaUserRepository } from '../infrastructure/databases/Postgres/userRepository.js';
import { MongoUserRepository } from '../infrastructure/databases/mongo/userRepository.js';

dotenv.config();

let prisma;
let mongoClient;

export const initializeDatabaseConnections = async () => {
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Connected to Postgres via Prisma');

    const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
    mongoClient = new MongoClient(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');

    return {
      prisma,
      prismaRepository: new PrismaUserRepository(prisma),
      mongoRepository: new MongoUserRepository(mongoClient),
    };
  } catch (err) {
    console.error('❌ Database connection error:', err);
    throw err;
  }
};

export const closeDatabaseConnections = async () => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log('✅ Prisma connection closed');
    }
    if (mongoClient) {
      await mongoClient.close();
      console.log('✅ MongoDB connection closed');
    }
  } catch (err) {
    console.error('❌ Error closing connections:', err);
  }
};
