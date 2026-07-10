import { http, HttpResponse } from "msw";

export const MOCK_ACCESS_TOKEN = "mock-msal-access-token";

export const msalAuthHandlers = [
  http.post(
    "https://login.microsoftonline.com/:tenantId/oauth2/v2.0/token",
    () => {
      return HttpResponse.json({
        access_token: MOCK_ACCESS_TOKEN,
        token_type: "Bearer",
        expires_in: 3600,
        scope: "https://graph.microsoft.com/.default",
      });
    }
  ),
];
