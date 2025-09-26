import jwt from "jsonwebtoken";

export async function authMiddleware(req, reply) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(400).send({
        success: false,
        message: "Authorization token missing or invalid format",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = decoded;
  } catch (error) {
    console.error("JWT Error:", error.message);
    return reply.status(400).send({
      success: false,
      message: "Token is expired or invalid, user not allowed",
    });
  }
}
