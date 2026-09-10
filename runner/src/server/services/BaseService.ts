import { createChildLogger, Logger } from "../utils/logger";

type LogFn = (action: string, data?: Record<string, unknown>) => void;

export class BaseService {
  private logger: Logger;

  log: {
    trace: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
  };

  constructor(serviceName: string) {
    this.logger = createChildLogger({ service: serviceName });

    this.log = {
      trace: (action, data) =>
        this.logger.trace({ action, data }, `${serviceName}.${action}`),
      info: (action, data) =>
        this.logger.info({ action, data }, `${serviceName}.${action}`),
      warn: (action, data) =>
        this.logger.warn({ action, data }, `${serviceName}.${action}`),
      error: (action, data) =>
        this.logger.error({ action, data }, `${serviceName}.${action}`),
    };
  }
}
