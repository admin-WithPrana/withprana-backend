export class SettingsController {
  constructor(usecase) {
    if (!usecase) throw new Error("Usecase is required for SettingsController");
    this.usecase = usecase;
  }

  async createOrUpdate(req, reply) {
    try {
      const settingsData = {
        tagline: req.body.tagline,
        currentVersion: req.body.currentVersion,
        supportEmail: req.body.supportEmail,
        releaseNote: req.body.releaseNote,
        adminEmail: req.body.adminEmail,
      };

      const settings = await this.usecase.createOrUpdateSettings(settingsData);

      return reply.code(201).send({
        status: "success",
        message: "Settings saved successfully",
        data: settings,
      });
    } catch (err) {
      return reply.code(400).send({
        status: "error",
        message: err.message,
      });
    }
  }

  async get(req, reply) {
    try {
      const settings = await this.usecase.getSettings();

      if (!settings) {
        return reply.code(404).send({
          status: "error",
          message: "Settings not found",
          error: "SETTINGS_NOT_FOUND",
        });
      }

      return reply.code(200).send({
        status: "success",
        message: "Settings fetched successfully",
        data: settings,
      });
    } catch (err) {
      return reply.code(400).send({
        status: "error",
        message: err.message,
      });
    }
  }
}
