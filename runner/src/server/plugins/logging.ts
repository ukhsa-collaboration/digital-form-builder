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
    logRequestStart: false,
    logRequestComplete: false,
    ignoreFunc: async (_options, request) => {
      return (
        request.path.startsWith("/assets") ||
        request.path === "/session/keep-alive"
      );
    },
    redact: {
      paths: config.logRedactPaths,
      censor: "REDACTED",
    },
  },
};
