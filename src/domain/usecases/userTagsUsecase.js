export class userTagsUsecase {
    constructor(tagsRepository) {
        this.tagsRepository = tagsRepository;
    }

    async addTags(user, tagIds) {
        try {
            // Validate input
            if (!user || !user.id) {
                throw new Error('User authentication required');
            }

            if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
                throw new Error('Tags array is required and cannot be empty');
            }

            // Validate that all tag IDs are non-empty strings
            const invalidTags = tagIds.filter(tagId => !tagId || typeof tagId !== 'string' || tagId.trim() === '');
            if (invalidTags.length > 0) {
                throw new Error(`Invalid tag IDs: ${invalidTags.join(', ')}`);
            }

            // Debug: Log the user ID being used
            console.log('User ID being used:', user.id, 'Type:', typeof user.id);

            // Check if user exists in the database
            const userExists = await this.tagsRepository.checkUserExists(user.id);
            if (!userExists) {
                throw new Error(`User with ID ${user.id} does not exist`);
            }

            // Check if tags exist in the database
            const existingTags = await this.tagsRepository.getTagsByIds(tagIds);
            if (existingTags.length !== tagIds.length) {
                const existingTagIds = existingTags.map(tag => tag.id);
                const missingTags = tagIds.filter(tagId => !existingTagIds.includes(tagId));
                throw new Error(`Tags not found: ${missingTags.join(', ')}`);
            }

            // Add user tags
            const userTags = await this.tagsRepository.addUserTags(user.id, tagIds);

            if (!userTags || userTags.length === 0) {
                throw new Error('Failed to add tags');
            }

            return userTags;
        } catch (error) {
            throw new Error(`Failed to add tags: ${error.message}`);
        }
    }
}