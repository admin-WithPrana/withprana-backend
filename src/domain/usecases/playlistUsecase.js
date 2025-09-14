export class PlaylistUsecase {
  constructor(repo) {
    this.repo = repo;
  }

  async createPlaylist(data) {
    try {
      return await this.repo.create(data);
    } catch (err) {
      throw new Error(`Usecase Error (createPlaylist): ${err.message}`);
    }
  }

  async updatePlaylist(id, data) {
    try {
      return await this.repo.update(id, data);
    } catch (err) {
      throw new Error(`Usecase Error (updatePlaylist): ${err.message}`);
    }
  }

//   async getPlaylistById(id) {
//     try {
//       return await this.repo.findById(id);
//     } catch (err) {
//       throw new Error(`Usecase Error (getPlaylistById): ${err.message}`);
//     }
//   }
 async getPlaylistById(id, paginationOptions = {}) {
  try {
    const playlist = await this.repo.getPlaylistById(id, paginationOptions);
    
    if (!playlist) {
      throw new Error("Playlist not found");
    }
    
    return playlist;
  } catch (err) {
    throw new Error(`Usecase Error (getPlaylistById): ${err.message}`);
  }
}

  async getAll(where = {}, skip, take) {
    try {
      const filter = where.where || where;
      return await this.repo.findAllPaginated(filter, skip, take);
    } catch (err) {
      throw new Error(`Usecase Error (getAll): ${err.message}`);
    }
  }

  async deletePlaylist(id) {
    try {
      return await this.repo.delete(id);
    } catch (err) {
      throw new Error(`Usecase Error (deletePlaylist): ${err.message}`);
    }
  }

  async addMeditationsToPlaylist(playlistId, meditationIds) {
    try {
      return await this.repo.addMeditations(playlistId, meditationIds);
    } catch (err) {
      throw new Error(`Usecase Error (addMeditationsToPlaylist): ${err.message}`);
    }
  }

  async removeMeditationFromPlaylist(playlistId, meditationId) {
    try {
      return await this.repo.removeMeditation(playlistId, meditationId);
    } catch (err) {
      throw new Error(`Usecase Error (removeMeditationFromPlaylist): ${err.message}`);
    }
  }
}