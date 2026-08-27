import config from "../config";
import pino from "hapi-pino";
import { logger } from "../utils/logger";

const logFilter = config.isDev
  ? (request: any) => !request.path.startsWith("/assets")
  : false;

export default {
  plugin: pino,
  options: {
    instance: logger,
    debug: config.isDev,
    logRequestStart: logFilter,
    logRequestComplete: logFilter,
  },
};
