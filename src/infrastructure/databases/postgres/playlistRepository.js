export class PlaylistRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return await this.prisma.playlist.create({
      data,
      include: { items: { include: { meditation: true } } },
    });
  }

  async update(id, data) {
    return await this.prisma.playlist.update({
      where: { id },
      data,
      include: { items: { include: { meditation: true } } },
    });
  }

  async findById(id) {
    return await this.prisma.playlist.findUnique({
      where: { id },
      include: { items: { include: { meditation: true } } },
    });
  }

  async getPlaylistById(id, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
  
    return await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            meditation: {
              include: {
                category: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { items: true },
        },
      },
    });
  }
  

  async findAll(filter = {}) {
    return await this.prisma.playlist.findMany({
      where: filter,
      include: { items: { include: { meditation: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllPaginated(filter = {}, skip, take) {
  const [playlists, totalCount] = await this.prisma.$transaction([
    this.prisma.playlist.findMany({
      where: filter,
      skip,
      take,
      include: {
        _count: {
          select: { items: true },
        },
      },
    }),
    this.prisma.playlist.count({ where: filter }),
  ]);

  return { playlists, totalCount };
}


  async delete(id) {
    return await this.prisma.playlist.delete({ where: { id } });
  }

  async addMeditations(playlistId, meditationIds) {
    console.log(playlistId,meditationIds)
  const ids = Array.isArray(meditationIds) ? meditationIds : [meditationIds];

  return this.prisma.playlistMeditation.createMany({
    data: ids.map(meditationId => ({
      playlistId,
      meditationId,
    })),
    skipDuplicates: true,
  });
}

  async removeMeditation(playlistId, meditationId) {
    return this.prisma.playlistMeditation.deleteMany({
      where: { playlistId, meditationId },
    });
  }
}