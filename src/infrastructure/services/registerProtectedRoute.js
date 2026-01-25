import { authMiddleware } from "./middleware.js";
import { setPrismaUser } from "../../config/database.js"

export function registerProtectedRoute(app, prefix, routeRegisterFn, deps) {
    app.register(async function (scope) {
        scope.addHook("onRequest", async (req, reply) => {
            await authMiddleware(req, reply, () => { });
            if (req.user?.id) {
                setPrismaUser(req.user.id);
            } else {
                setPrismaUser("system");
            }
        });

        // call the actual route registration
        routeRegisterFn(scope, deps);
    }, { prefix });
}
