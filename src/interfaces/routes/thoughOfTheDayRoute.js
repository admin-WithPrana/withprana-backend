import fastifyMultipart from '@fastify/multipart';
import { ThoughtOfTheDayUsecase } from '../../domain/usecases/thoughOfTheDayUsecase.js';
import { ThoughtOfTheDayRepository } from '../../infrastructure/databases/postgres/thoughOfTheDayRepository.js';
import { ThoughtOfTheDayController } from '../controllers/thoughOfTheDayController.js';
import { uploadToCloudinary } from '../../infrastructure/services/cloudinaryService.js';

export const thoughtRoutes = (app, { prismaRepository,postQueue }) => {
  const thoughtRepository = new ThoughtOfTheDayRepository(prismaRepository.prisma);
  const thoughtUsecase = new ThoughtOfTheDayUsecase(thoughtRepository,postQueue);
  const thoughtController = new ThoughtOfTheDayController(thoughtUsecase);

  app.register(fastifyMultipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, 
    files: 5,
  },
  attachFieldsToBody: true, 
});

app.post('/', async (req, reply) => {
  try {
    const {
      title,
      description,
      duration,
      scheduledAt,
      thumbnail,
      link,
      scheduleNow,
      tags,
    } = req.body;

    // Handle file uploads or use string URLs
    let thumbnailUrl = null;
    let linkUrl = null;

    if (thumbnail?.file) {
      thumbnailUrl = await uploadToCloudinary(thumbnail, 'thoughts/thumbnails');
    } else if (typeof thumbnail === 'string') {
      thumbnailUrl = thumbnail;
    }

    if (link?.file) {
      linkUrl = await uploadToCloudinary(link, 'thoughts/audio');
    } else if (typeof link === 'string') {
      linkUrl = link;
    }

    // Parse tags if necessary
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (!Array.isArray(parsedTags)) parsedTags = [parsedTags];
      } catch {
        parsedTags = tags.split(',').map(t => t.trim());
      }
    }

    const payload = {
  title: typeof title === 'object' ? title.value : title,
  description: typeof description === 'object' ? description.value : description,
  duration: typeof duration === 'object' ? duration.value : duration,
  scheduledAt: scheduledAt?.value ? new Date(scheduledAt?.value) : undefined,
  scheduleNow: scheduleNow?.value === 'true' || scheduleNow?.value === true,
  thumbnail: thumbnailUrl || '',
  link:linkUrl || ''
};


    await thoughtController.createThought({ ...req, body: payload }, reply);
  } catch (error) {
    console.error('Error creating thought:', error);
    reply.status(500).send({
      error: 'Failed to create thought',
      details: error.message,
    });
  }
});

  app.post('/repost', (req, reply) => thoughtController.repostThought(req, reply));
  app.get('/', (req, reply) => thoughtController.getThoughts(req, reply));
  app.patch('/:id/mark-posted', (req, reply) => thoughtController.markAsPosted(req, reply));
};
