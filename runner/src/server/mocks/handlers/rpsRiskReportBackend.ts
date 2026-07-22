import { http, HttpResponse } from "msw";
import { v4 as uuidv4 } from "uuid";

export const rpsBackendLookupHandlers = [
  http.post("*/lookup", async ({ request }) => {
    const { UDPRN } = (await request.json()) as { UDPRN?: string };

    if (UDPRN === "20765140") {
      return HttpResponse.json({
        success: false,
        UDPRN,
        found: false,
        requestId: uuidv4(),
      });
    }

    return HttpResponse.json({
      success: true,
      UDPRN,
      TemplateId: "5",
      found: true,
      requestId: uuidv4(),
    });
  }),
];
