import fs from "node:fs";
import path from "node:path";
import config from "../config";
import { HapiRequest, HapiResponseToolkit } from "../types";
import type { ApplicationErrorMetadata } from "./engine/errors";
import { FormModel } from "./engine/models";

/**
 * Extracts the Project ID from the URL path
 * @param path a url path
 * @returns
 */
const extractProjectIdFromPath = (path: string) => {
  const segments = path.split("/").filter(Boolean);
  return segments[0];
};

/**
 * Get's a view from a folder
 *
 * @param folder the folder where the view is located. If not provided the default folder is `views`.
 * @param view the name of the view
 * @returns
 */
const getView = (folder: string, view: string) => {
  const viewPath = path.join(__dirname, `../views/${folder}/${view}.html`);

  if (!fs.existsSync(viewPath)) {
    return undefined;
  }

  return folder ? `${folder}/${view}` : view;
};

/**
 * Finds the first view that exists across a list of candidate folders,
 * checked in order (e.g. project folder, then group folder, then generic).
 *
 * @param folders the folders to check, in priority order
 * @param view the name of the view
 * @returns
 */
const findView = (folders: (string | undefined)[], view: string) => {
  for (const folder of folders) {
    const match = folder !== undefined && getView(folder, view);
    if (match) return match;
  }
  return undefined;
};

/**
 * Handles the rendering of errors caused by application errors
 *
 * @param request a hapi request object
 * @param response a hapi response toolkit
 * @param data the metadata ({@link ApplicationErrorMetadata}) attached to the application error
 * @param group the project group name
 * @returns
 */
const handleApplicationError = (
  request: HapiRequest,
  response: HapiResponseToolkit,
  data: ApplicationErrorMetadata,
  group?: string
) => {
  // extract project from url path
  const projectId = extractProjectIdFromPath(request.path);
  const code = `${data.code}`;

  // views are looked up from most to least specific: project, group, generic
  const folders = [projectId, group, ""];

  const view =
    ("page" in data && data.page && findView(folders, data.page)) ||
    findView(folders, code);

  return response.view(view || code).code(data.code);
};

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
            // An error was raised during processing the request
            const statusCode = response.output.statusCode;

            try {
              const projectId = extractProjectIdFromPath(request.path);
              const form: FormModel | undefined = server.app.forms[projectId];

              const group = form?.def.group;
              const formName = form?.name;

              request.log("error", {
                statusCode: statusCode,
                data: response.data,
                message: response.message,
              });

              // In the event of 403 (CSRF protection)
              if (statusCode === 403) {
                return h
                  .view("csrf-protection", {
                    url: projectId,
                    name: formName,
                  })
                  .code(statusCode);
              }

              if (
                response.message.includes("ControllerError") ||
                response.message.includes("RenderingError")
              ) {
                return handleApplicationError(request, h, response.data, group);
              }

              return h
                .view("500", { name: formName || config.serviceName })
                .code(statusCode);
            } catch (error) {
              // The return the `500` view
              return h.view("500").code(statusCode);
            }
          }

          return h.continue;
        }
      );
    },
  },
};
