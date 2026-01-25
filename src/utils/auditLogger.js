import { getPrismaUser, prisma } from "../config/database";

export const auditLog = async ({
    action,
    entity,
    entityId,
    before,
    after
}) => {
    await prisma.auditLog.create({
        data: {
            userId: getPrismaUser(),
            action,
            entity,
            entityId,
            before,
            after
        }
    });
};
