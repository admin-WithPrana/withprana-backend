import { MeditationRepository } from '../../infrastructure/databases/postgres/meditationRepository.js';
import { MeditationUsecase } from '../../domain/usecases/meditationUsecase.js';
import { MeditationController } from '../controllers/meditationController.js';
import fastifyMultipart from '@fastify/multipart';
import { uploadToCloudinary } from '../../infrastructure/services/cloudinaryService.js';

export const meditationRoutes = async (app, { prismaRepository }) => {
  const repo = new MeditationRepository(prismaRepository.prisma);
  const usecase = new MeditationUsecase(repo);
  const controller = new MeditationController(usecase);

  app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 2
    },
    attachFieldsToBody: true
  });

  app.post('/', async (req, reply) => {
    try {
      const { title, description, duration, categoryId, audioFile, thumbnail, isPremium, active,subcategoryId,type} = req.body;
      console.log(req.body.subcategoryId)

      let audioFileUrl = null;
      let thumbnailUrl = null;

      if (audioFile?.file) {
        audioFileUrl = await uploadToCloudinary(
          audioFile,
          'meditations/audio'
        );
      } else if (typeof audioFile === 'string' && audioFile.trim() !== '') {
        audioFileUrl = audioFile;
      }

      if (!audioFileUrl) {
        return reply.status(400).send({
          error: 'Audio file is required',
          message: 'The link field cannot be null. Please upload an audio file.'
        });
      }

      if (thumbnail?.file) {
        thumbnailUrl = await uploadToCloudinary(
          thumbnail,
          'meditations/thumbnails'
        );
      } else if (typeof thumbnail === 'string' && thumbnail.trim() !== '') {
        thumbnailUrl = thumbnail;
      }

      const payload = {
        title: typeof title === 'object' ? title.value : title,
        description: typeof description === 'object' ? description.value : description,
        duration: typeof duration === 'object' ? parseInt(duration.value) : parseInt(duration),
        categoryId: typeof categoryId === 'object' ? categoryId.value : categoryId,
        link: audioFileUrl, 
        thumbnail: thumbnailUrl,
        isPremium: typeof isPremium === 'object' ? isPremium.value === 'true' : Boolean(isPremium),
        active: typeof active === 'object' ? active.value === 'true' : Boolean(active),
        subcategoryId: typeof subcategoryId === 'object' ? subcategoryId.value : subcategoryId,
        type:typeof type === 'object' ? type.value : type,
      };

      await controller.create({ ...req, body: payload }, reply);

    } catch (error) {
      console.error('Meditation creation error:', error);
      reply.status(500).send({ 
        error: 'Failed to create meditation', 
        details: error.message 
      });
    }
  });

  app.patch('/:id', async (req, reply) => {
  try {
    const { id } = req.params;   // <-- get id from params

    const { 
      title, description, duration, categoryId, 
      audioFile, thumbnail, isPremium, active, 
      subcategoryId, type
    } = req.body;

    let audioFileUrl = null;
    let thumbnailUrl = null;

    if (audioFile?.file) {
      audioFileUrl = await uploadToCloudinary(audioFile, 'meditations/audio');
    } else if (typeof audioFile === 'string' && audioFile.trim() !== '') {
      audioFileUrl = audioFile;
    }

    if (thumbnail?.file) {
      thumbnailUrl = await uploadToCloudinary(thumbnail, 'meditations/thumbnails');
    } else if (typeof thumbnail === 'string' && thumbnail.trim() !== '') {
      thumbnailUrl = thumbnail;
    }

    const updatePayload = {
      ...(title !== undefined && { title: typeof title === 'object' ? title.value : title }),
      ...(description !== undefined && { description: typeof description === 'object' ? description.value : description }),
      ...(duration !== undefined && { duration: typeof duration === 'object' ? parseInt(duration.value) : parseInt(duration) }),
      ...(categoryId !== undefined && { categoryId: typeof categoryId === 'object' ? categoryId.value : categoryId }),
      ...(subcategoryId !== undefined && { subcategoryId: typeof subcategoryId === 'object' ? subcategoryId.value : subcategoryId }),
      ...(type !== undefined && { type: typeof type === 'object' ? type.value : type }),
      ...(audioFileUrl && { link: audioFileUrl }),
      ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
      ...(isPremium !== undefined && { 
        isPremium: typeof isPremium === 'object' ? isPremium.value === 'true' : Boolean(isPremium)
      }),
      ...(active !== undefined && { 
        active: typeof active === 'object' ? active.value === 'true' : Boolean(active)
      })
    };

    await controller.update({ id, data: updatePayload }, reply);

  } catch (error) {
    console.error('Meditation update error:', error);
    reply.status(500).send({ 
      error: 'Failed to update meditation', 
      details: error.message 
    });
  }
});


  app.get('/', (req, reply) => controller.getAll(req, reply));
  app.get('/:id', (req, reply) => controller.getById(req, reply));
  app.get('/subcategory', (req, reply) => controller.getMeditationBySubCategoryId(req, reply));
   app.get('/category', (req, reply) => controller.getMeditationByCategoryId(req, reply));
  app.delete('/:id', (req, reply) => controller.delete(req, reply));
};