import { http, HttpResponse } from "msw";
import { createChildLogger } from "../../utils/logger";
import {
  saveGasTestKitDetailsSchema,
  StoreGtkResponse,
} from "@xgovformbuilder/model";

const logger = createChildLogger({ name: "gtkBackend" });

/**
 * Post request to store a gas test kit order, matching gas-test-kit-api-spec.json's
 * POST /storegtk.
 */
export const storeGtkEndpoint = http.post("*/storegtk", async ({ request }) => {
  const validated = saveGasTestKitDetailsSchema.validate(await request.json());

  if (validated.error) {
    logger.error(
      { err: validated.error },
      "Mock /storegtk request failed validation"
    );

    return HttpResponse.json(validated.error, { status: 500 });
  }

  const response: StoreGtkResponse = {
    uuid: validated.value.uuid,
    message: "details stored",
  };

  return HttpResponse.json(response);
});

export const rpsGasTestKitBackendHandlers = [storeGtkEndpoint];
