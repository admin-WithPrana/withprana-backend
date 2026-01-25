import jwt, { decode } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../../infrastructure/databases/postgres/userRepository.js";

// Initialize Prisma Client and Repository
// Note: In a production app with dependency injection, this should be injected.
// But for middleware in this structure, we instantiate here or reuse a singleton.
const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);

export async function authMiddleware(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.code(401).send({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return reply.code(401).send({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userRepository.findById(decoded.id);

    if (!user) {
      return reply.code(401).send({ message: "User not found" });
    }

    if (user.active === false) {
      return reply.code(403).send({ message: "User account is inactive" });
    }

    request.user = user;

    if (typeof request.body === "object" && request.body !== null) {
      request.body.email = user.email;
      request.body.name = user.name;
      request.body.user = user;
    } else {
      request.body = {
        email: user.email,
        name: user.name,
        user,
      };
    }
  } catch (err) {
    return reply.code(403).send({ message: "Invalid or expired token" });
  }
}

