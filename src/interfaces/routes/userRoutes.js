// import { UserController } from '../controllers/userController.js';
// import { PostgresOTPRepository } from '../../infrastructure/databases/postgres/otpRepository.js';
// import {PrismaUserRepository}  from "../../infrastructure/databases/postgres/userRepository.js"

// // userRoutes.js
// export const setupRoutes = (app, { prismaRepository, mailer }) => {
//   if (!prismaRepository || !prismaRepository.prisma) {
//     throw new Error('Prisma client is not properly initialized');
//   }

//   const otpRepo = new PostgresOTPRepository(prismaRepository.prisma);
//   const userRepo = new PrismaUserRepository(prismaRepository.prisma);

//   const userController = new UserController(
//     userRepo,
//     otpRepo,
//     mailer
//   );

//   app.post('/register', (request, reply) => userController.register(request, reply));
//   app.post('/verify', (request, reply) => userController.verify(request, reply));
//   app.post('/resend-otp', (request, reply) => userController.resendOTP(request, reply));
//   app.post('/login', (request, reply) => userController.login(request, reply));
//   app.get('/:id', (request, reply) => userController.getUserById(request, reply));
// };
import { UserController } from '../controllers/userController.js';
import { PostgresOTPRepository } from '../../infrastructure/databases/postgres/otpRepository.js';
import { PrismaUserRepository } from "../../infrastructure/databases/postgres/userRepository.js";
import fastifyMultipart from '@fastify/multipart';
import { uploadToCloudinary } from '../../infrastructure/services/cloudinaryService.js';

// userRoutes.js
export const setupRoutes = (app, { prismaRepository, mailer }) => {
  if (!prismaRepository || !prismaRepository.prisma) {
    throw new Error('Prisma client is not properly initialized');
  }

  const otpRepo = new PostgresOTPRepository(prismaRepository.prisma);
  const userRepo = new PrismaUserRepository(prismaRepository.prisma);

  const userController = new UserController(
    userRepo,
    otpRepo,
    mailer
  );

  // Register multipart plugin for file uploads
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for profile pictures
      files: 1
    },
    attachFieldsToBody: true
  });

  app.post('/register', async (request, reply) => {
    try {
      const { name, email, password, phone, profilePicture } = request.body;
      
      let profilePictureUrl = null;

      if (profilePicture?.file) {
        profilePictureUrl = await uploadToCloudinary(
          profilePicture,
          'users/profile-pictures'
        );
      } else if (typeof profilePicture === 'string' && profilePicture.trim() !== '') {
        profilePictureUrl = profilePicture;
      }

      const payload = {
        name: typeof name === 'object' ? name.value : name,
        email: typeof email === 'object' ? email.value : email,
        password: typeof password === 'object' ? password.value : password,
        phone: typeof phone === 'object' ? phone.value : phone,
        ...(profilePictureUrl && { profilePicture: profilePictureUrl })
      };

      await userController.register({ ...request, body: payload }, reply);

    } catch (error) {
      console.error('User registration error:', error);
      reply.status(500).send({ 
        error: 'Failed to register user', 
        details: error.message 
      });
    }
  });

  app.post('/verify', (request, reply) => userController.verify(request, reply));
  app.post('/resend-otp', (request, reply) => userController.resendOTP(request, reply));
  app.post('/login', (request, reply) => userController.login(request, reply));
  
  app.get('/:id', (request, reply) => userController.getUserById(request, reply));


  app.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, email, phone, profilePicture, ...otherFields } = request.body;
      
      let profilePictureUrl = undefined;

      if (profilePicture) {
        if (profilePicture?.file) {
          profilePictureUrl = await uploadToCloudinary(
            profilePicture,
            'users/profile-pictures'
          );
        } else if (typeof profilePicture === 'string' && profilePicture.trim() !== '') {
          profilePictureUrl = profilePicture;
        }
      }

      const updatePayload = {
        ...(name !== undefined && { name: typeof name === 'object' ? name.value : name }),
        ...(email !== undefined && { email: typeof email === 'object' ? email.value : email }),
        ...(phone !== undefined && { phone: typeof phone === 'object' ? phone.value : phone }),
        ...(profilePictureUrl !== undefined && { profilePicture: profilePictureUrl }),
        ...otherFields
      };

      await userController.updateUser({ ...request, params: { id }, body: updatePayload }, reply);

    } catch (error) {
      console.error('User update error:', error);
      reply.status(500).send({ 
        error: 'Failed to update user', 
        details: error.message 
      });
    }
  });

  app.delete('/:id', (request, reply) => userController.deleteUser(request, reply));
};