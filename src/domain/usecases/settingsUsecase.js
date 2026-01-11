export class SettingsUsecase {
  constructor(repo) {
    if (!repo) throw new Error("Repository is required");
    this.repo = repo;
  }

  async createOrUpdateSettings(data) {
    try {
      if (!data.tagline || !data.currentVersion) {
        throw new Error("Tagline and currentVersion are required");
      }

      const existingSettings = await this.repo.getSettings();

      if (existingSettings) {
        return await this.repo.updateSettings({
          tagline: data.tagline,
          currentVersion: data.currentVersion,
          supportEmail: data.supportEmail,
          releaseNote: data.releaseNote,
          adminEmail: data.adminEmail,
        });
      }

      return await this.repo.createSettings({
        tagline: data.tagline,
        currentVersion: data.currentVersion,
        supportEmail: data.supportEmail,
        releaseNote: data.releaseNote,
        adminEmail: data.adminEmail,
      });
    } catch (err) {
      console.error("Usecase Error (createOrUpdateSettings):", err.message);
      throw new Error(`Usecase Error (createOrUpdateSettings): ${err.message}`);
    }
  }

  async getSettings() {
    try {
      const settings = await this.repo.getSettings();
      return settings;
    } catch (err) {
      throw new Error(`Usecase Error (getSettings): ${err.message}`);
    }
  }
}
