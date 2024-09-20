import { HapiRequest, HapiResponseToolkit } from "../types";
import client from "prom-client";
import register from "server/plugins/promRegistry";

export const errorCounter = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors",
  labelNames: ["status_code"],
});

register.registerMetric(errorCounter);

/*
 * Add an `onPreResponse` listener to return error pages
 */
export default {
  plugin: {
    name: "error-pages",
    register: (server) => {
      server.ext(
        "onPreResponse",
        (request: HapiRequest, h: HapiResponseToolkit) => {
          const response = request.response;

          if ("isBoom" in response && response.isBoom) {
            // An error was raised during
            // processing the request
            const statusCode = response.output.statusCode;

            errorCounter.inc({ status_code: statusCode }); // Increment error counter

            // In the event of 404
            // return the `404` view
            if (statusCode === 404) {
              return h.view("404").code(statusCode);
            }

            request.log("error", {
              statusCode: statusCode,
              data: response.data,
              message: response.message,
            });

            // The return the `500` view
            return h.view("500").code(statusCode);
          }
          return h.continue;
        }
      );
    },
  },
};
