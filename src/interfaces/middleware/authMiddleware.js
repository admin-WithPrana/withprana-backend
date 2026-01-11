import jwt from "jsonwebtoken";
import { decrypt, decryptDeterministic } from "../../utils/encryption.js";

export function authMiddleware(req, res, next) {
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

    // Decrypt user info
    const decryptedUser = {
      ...decoded,
      email: decryptDeterministic(decoded.email),
      name: decoded.name ? decrypt(decoded.name) : undefined,
    };

    req.user = decryptedUser;

    // As requested: store the username and email in the request body
    // Merging to avoid overwriting existing body data if any (though body is usually parsed by fastify)
    if (typeof req.body === "object" && req.body !== null) {
      req.body.email = decryptedUser.email;
      req.body.name = decryptedUser.name;
      // Optionally add the whole user object if needed, but the requirement specifically mentioned username, email.
      req.body.user = decryptedUser; // Helpful for some controllers
    } else {
      // If body is empty/null, initialize it
      req.body = {
        email: decryptedUser.email,
        name: decryptedUser.name,
        user: decryptedUser,
      };
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}
