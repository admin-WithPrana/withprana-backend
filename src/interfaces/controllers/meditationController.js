export class MeditationController {
  constructor(meditationUsecase) {
    this.meditationUsecase = meditationUsecase;
  }

  async createMeditation(meditationData) {
    try {
      const meditation = await this.meditationUsecase.createMeditation(meditationData);
      return meditation;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async create(req, reply) {
    try {
      const { title, description, duration, link, thumbnail, isPremium, categoryId, subcategoryId } = req.body;
      const file = req.file;

      const meditationData = {
        title,
        description,
        duration: Number(duration),
        link,
        thumbnail,
        isPremium: isPremium === "true" || isPremium === true,
        categoryId: Number(categoryId),
        subcategoryId: subcategoryId || null,
        audioFile: file || null
      };

      const meditation = await this.meditationUsecase.createMeditation(meditationData);
      reply.send(meditation);
    } catch (err) {
      reply.status(400).send({ message: err.message });
    }
  }

  async getById(req, reply) {
    try {
      const id = req.params.id;
      const meditation = await this.meditationUsecase.getMeditationById(id);
      reply.send(meditation);
    } catch (err) {
      reply.status(404).send({ message: err.message });
    }
  }

  async getAll(req, reply) {
    try {
      const meditations = await this.meditationUsecase.getAllMeditations();
      reply.send(meditations);
    } catch (err) {
      reply.status(500).send({ message: err.message });
    }
  }

  async update(req, reply) {
    try {
      const id = req.params.id;
      const data = req.body;
      const updatedMeditation = await this.meditationUsecase.updateMeditation(id, data);
      reply.send(updatedMeditation);
    } catch (err) {
      reply.status(400).send({ message: err.message });
    }
  }

  async delete(req, reply) {
    try {
      const id = req.params.id;
      const result = await this.meditationUsecase.deleteMeditation(id);
      reply.send(result);
    } catch (err) {
      reply.status(400).send({ message: err.message });
    }
  }
}