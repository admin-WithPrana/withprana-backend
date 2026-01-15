import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "../../infrastructure/databases/postgres/userRepository.js";

// Initialize Prisma Client and Repository
// Note: In a production app with dependency injection, this should be injected.
// But for middleware in this structure, we instantiate here or reuse a singleton.
const prisma = new PrismaClient();
const userRepository = new PrismaUserRepository(prisma);

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB using the ID from token.
    // The repository's findById method handles the decryption logic correctly.
    const user = await userRepository.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.active === false) {
      return res.status(403).json({ message: "User account is inactive" });
    }

    req.user = user;

    // Populate body for backward compatibility / controller convenience
    if (typeof req.body === "object" && req.body !== null) {
      req.body.email = user.email;
      req.body.name = user.name;
      req.body.user = user;
    } else {
      req.body = {
        email: user.email,
        name: user.name,
        user: user,
      };
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
