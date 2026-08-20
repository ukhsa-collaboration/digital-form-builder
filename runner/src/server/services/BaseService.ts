import { createChildLogger, Logger } from "../utils/logger";

export class BaseService {
  logger: Logger;

  constructor(serviceName: string) {
    this.logger = createChildLogger({ service: serviceName });
  }
}
