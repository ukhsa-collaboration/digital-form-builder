import { HapiRequest, HapiResponseToolkit } from "../types";
import config from "../config";

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

            // In the event of 403 (CSRF protection)
            if (statusCode === 403) {
              const url = request.url;
              const formname = url.pathname.split("/");

              try {
                const form = server.app.forms[formname[1]];
                return h
                  .view("csrf-protection", { url: url, name: form.name })
                  .code(statusCode);
              } catch (e) {
                return h
                  .view("csrf-protection", {
                    url: url,
                    name: config.serviceName,
                  })
                  .code(statusCode);
              }
            }

            // The return the `500` view
            return h.view("500").code(statusCode);
          }
          return h.continue;
        }
      );
    },
  },
};
