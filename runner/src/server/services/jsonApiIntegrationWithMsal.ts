import { BaseService } from "./BaseService";
import { MsalAuthorizer } from "./msalAuthorizerService";

export interface JsonApiIntegrationWithMsalConfig {
  name: string;
  apimBaseUrl: string;
  callingApplication: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export class JsonApiIntegrationWithMsal extends BaseService {
  private readonly auth: MsalAuthorizer;
  private readonly config: JsonApiIntegrationWithMsalConfig;

  constructor(config: JsonApiIntegrationWithMsalConfig) {
    super(config.name);

    this.config = config;
    this.auth = new MsalAuthorizer(config);
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = {
      ...init.headers,
      "User-Agent": "X-GOV-Forms/1.0",
      "Content-Type": "application/json",
      Authorization: `Bearer ${await this.auth.getToken()}`,
    };

    const url = `${this.config.apimBaseUrl}${path}`;

    this.logger.trace(
      { url, headers, init },
      "JsonApiIntegrationWithMsal.request"
    );

    const response = await fetch(url, { ...init, headers });

    const body = await response.json();

    this.logger.trace(
      {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body,
      },
      "JsonApiIntegrationWithMsal.response"
    );

    return Promise.resolve(new Response(JSON.stringify(body), response));
  }
}
