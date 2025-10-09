export class userTagsController {
    constructor(tagUsecase) {
        this.tagUsecase = tagUsecase;
    }

    async addTags(req, reply) {
        try {
            const user = req.user;  
            const tagData = req.body.tags;
            
            if (!tagData || !Array.isArray(tagData) || tagData.length === 0) {
                return reply.status(400).send({ 
                    success: false, 
                    message: 'Tags array is required and cannot be empty' 
                });
            }

            const result = await this.tagUsecase.addTags(user, tagData);

            reply.send({
                success: true,
                message: 'Tags added successfully',
                data: result
            });
        } catch (err) {
            reply.status(500).send({ 
                success: false,
                message: err.message 
            });
        }
    }
}