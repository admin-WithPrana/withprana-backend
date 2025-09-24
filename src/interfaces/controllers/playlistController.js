export class PlaylistController {
  constructor(usecase) {
    this.usecase = usecase;
  }

  async create(req, reply) {
    try {
      const playlist = await this.usecase.createPlaylist(req.body);
      return reply.code(201).send({
        message: "Playlist created successfully",
        data: playlist,
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async update(req, reply) {
    try {
      const { id } = req.params;
      const playlist = await this.usecase.updatePlaylist(id, req.body);
      return reply.code(200).send({
        message: "Playlist updated successfully",
        data: playlist,
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

async getById(req, reply) {
  try {
    const { id } = req.params;
    let { page = 1, limit = 10 } = req.query;
    
    // Validate and sanitize pagination parameters
    page = Math.max(1, parseInt(page)) || 1;
    limit = Math.min(Math.max(1, parseInt(limit)), 100) || 10;
    
    const playlist = await this.usecase.getPlaylistById(id, { page, limit });
    
    if (!playlist) {
      return reply.code(404).send({ 
        message: "Playlist not found",
        error: "PLAYLIST_NOT_FOUND"
      });
    }
    
    const totalItems = playlist._count?.items || 0;
    const totalPages = Math.ceil(totalItems / limit);
    
    // Remove internal fields from response
    const { _count, ...playlistData } = playlist;
    
    return reply.code(200).send({
      message: "Playlist fetched successfully",
      data: playlistData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (err) {
    // Handle specific error types
    if (err.message.includes("not found")) {
      return reply.code(404).send({ 
        error: "Playlist not found",
        message: err.message 
      });
    }
    
    return reply.code(400).send({ 
      error: "Bad Request",
      message: err.message 
    });
  }
}

  async getAll(req, reply) {
  try {
    const { userId, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const { playlists, totalCount } = await this.usecase.getAll(
      {
        where: userId ? { userId: BigInt(userId) } : {},
        skip,
        take: parseInt(limit),
      }
    );

    return reply.code(200).send({
      message: "Playlists fetched successfully",
      data: playlists,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
}


  async delete(req, reply) {
    try {
      const { id } = req.params;
      await this.usecase.deletePlaylist(id);
      return reply.code(200).send({ message: "Playlist deleted successfully" });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async addMeditations(req, reply) {
    try {
      const { id } = req.params; // playlistId
      const { meditationIds } = req.body;
      const result = await this.usecase.addMeditationsToPlaylist(id, meditationIds);
      return reply.code(201).send({ message: "Meditations added to playlist", data: result });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }

  async removeMeditation(req, reply) {
    try {
      const { id, meditationId } = req.params;
      await this.usecase.removeMeditationFromPlaylist(id, meditationId);
      return reply.code(200).send({ message: "Meditation removed from playlist" });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  }
}