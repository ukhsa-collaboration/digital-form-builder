import { HapiRequest, HapiResponseToolkit } from "server/types";
import { RenderingError } from "../../../errors";

/**
 * Gets the FormModel based on the URL parameter `/{id}`.
 */
export function getForm(request: HapiRequest, _h: HapiResponseToolkit) {
  const id = request.params?.id;
  const form = request.server.app.forms?.[id];
  if (!form) {
    throw new RenderingError("Form not found", {
      code: 404,
    });
  }
  return form;
}
