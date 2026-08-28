import { BaseService } from "./BaseService";
import { MsalAuthorizer } from "./msalAuthorizerService";
import { redactJson } from "../utils/redactJson";

export interface JsonApiIntegrationWithMsalConfig {
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

  constructor(name: string, config: JsonApiIntegrationWithMsalConfig) {
    super(name);

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

    this.log.trace("request", {
      url,
      headers: await redactJson(headers),
      body: await redactJson(init.body),
    });

    const response = await fetch(url, { ...init, headers });

    const body = await response.json();

    this.log.trace("response", {
      status: response.status,
      statusText: response.statusText,
      headers: await redactJson(response.headers),
      body: await redactJson(body),
    });

    return Promise.resolve(new Response(JSON.stringify(body), response));
  }
}
