export class CreatePlanDTO {
  constructor(body) {
    this.name = body.name;
    this.price = parseFloat(body.price);
    this.interval = body.interval;
    this.intervalCount = parseInt(body.intervalCount) || 1;
    this.trialDays = body.trialDays ? parseInt(body.trialDays) : undefined;
    this.currency = body.currency || 'usd';
  }

  validate() {
    if (!this.name || !this.price || !this.interval) {
      throw new Error('Name, price, and interval are required');
    }
    if (this.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    if (!['month', 'year'].includes(this.interval.toLowerCase())) {
      throw new Error('Interval must be "month" or "year"');
    }
  }
}

export class SubscriptionFiltersDTO {
  constructor(query) {
    this.page = parseInt(query.page) || 1;
    this.limit = parseInt(query.limit) || 10;
    this.status = query.status;
    this.userId = query.userId;
    this.planId = query.planId;
    this.search = query.search;
  }

  validate() {
    if (this.page < 1) throw new Error('Page must be greater than 0');
    if (this.limit < 1 || this.limit > 100) throw new Error('Limit must be between 1 and 100');
  }
}

export class TransactionFiltersDTO {
  constructor(query) {
    this.page = parseInt(query.page) || 1;
    this.limit = parseInt(query.limit) || 10;
    this.status = query.status;
    this.type = query.type;
    this.userId = query.userId;
    this.subscriptionId = query.subscriptionId;
  }

  validate() {
    if (this.page < 1) throw new Error('Page must be greater than 0');
    if (this.limit < 1 || this.limit > 100) throw new Error('Limit must be between 1 and 100');
  }
}