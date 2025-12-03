export class PostgresSettingsRepository {
  constructor(prisma) {
    if (!prisma) {
      throw new Error("Prisma client is required for PostgresSettingsRepository");
    }
    this.prisma = prisma;
  }

  async createSettings(settings) {
    try {
      return await this.prisma.settings.create({
        data: {
          tagline: settings.tagline,
          currentVersion: settings.currentVersion,
          supportEmail: settings.supportEmail,
          releaseNote: settings.releaseNote,
          adminEmail: settings.adminEmail,
        },
      });
    } catch (error) {
      console.error("Error in createSettings:", error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const result = await this.prisma.settings.findFirst({
        orderBy: { createdAt: "desc" }, // get the latest
      });
      return result || null;
    } catch (error) {
      console.error("Error in getSettings:", error);
      throw error;
    }
  }

  async updateSettings(data) {
    try {
      const existing = await this.prisma.settings.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (!existing) {
        throw new Error("No settings found to update");
      }

      return await this.prisma.settings.update({
        where: { id: existing.id },
        data: {
          tagline: data.tagline,
          currentVersion: data.currentVersion,
          supportEmail: data.supportEmail,
          releaseNote: data.releaseNote,
          adminEmail: data.adminEmail,
        },
      });
    } catch (error) {
      console.error("Error in updateSettings:", error);
      throw error;
    }
  }
}
