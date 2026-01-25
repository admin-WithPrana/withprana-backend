import { getPrismaUser } from "../../config/database.js"

export const auditMiddleware = async (params, next) => {
    const auditActions = ['create', 'update', 'delete', 'upsert']
    if (!params.model || !auditActions.includes(params.action)) {
        return next(params)
    }

    let before = null

    if (params.action === 'update' || params.action === 'delete') {
        before = await params.runInTransaction
            ? null
            : params.args?.where
                ? params.prisma[params.model].findUnique({ where: params.args.where })
                : null
    }

    const result = await next(params)

    await params.prisma.auditLog.create({
        data: {
            userId: getPrismaUser(),
            action: params.action.toUpperCase(),
            model: params.model,
            recordId: result?.id?.toString(),
            before,
            after: params.action === 'delete' ? null : result
        }
    })

    return result
}
