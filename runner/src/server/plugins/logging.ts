import config from "../config";
import pino from "hapi-pino";
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
    logRequestStart: config.isDev,
    logRequestComplete: config.isDev,
    ignoreFunc: async (_options, request) => true,
    redact: {
      paths: config.logRedactPaths,
      censor: "REDACTED",
    },
    ignorePaths: ["/assets"],
  },
};
