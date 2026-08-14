import config from "../config";
import pino from "hapi-pino";

const logFilter = config.isDev
  ? (request: any) => !request.path.startsWith("/assets")
  : false;

export default {
  plugin: pino,
  options: {
    prettyPrint:
      config.logPrettyPrint === "true" || config.logPrettyPrint === true,
    level: config.logLevel,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    debug: config.isDev,
    logRequestStart: logFilter,
    logRequestComplete: logFilter,
    redact: {
      paths: config.logRedactPaths,
      censor: "REDACTED",
    },
  },
};
