import { http, HttpResponse, RequestHandler } from "msw";
import { createChildLogger } from "../../utils/logger";
import { rpsEnquiryRequestSchema } from "@xgovformbuilder/model";

const logger = createChildLogger({ name: "rpsRiskReportBackend" });

/**
 * RPS enquiry endpoint to submit an enquiry in salesforce
 */
const storeEnquiryDetailsEndpoint = http.post(
  "*/sendcase",
  async ({ request }) => {
    const validated = rpsEnquiryRequestSchema.validate(await request.json());

    if (validated.error) {
      logger.error(
        { err: validated.error },
        "Mock /sendcase request failed validation"
      );
      return HttpResponse.json(validated.error, { status: 500 });
    }

    return HttpResponse.json(undefined, { status: 200 });
  }
);

export const rpsEnquiryBackendHandlers: RequestHandler[] = [
  storeEnquiryDetailsEndpoint,
];
