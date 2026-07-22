import { MsalAuthorizer } from "./msalAuthorizerService";

export interface JsonApiIntegrationWithMsalConfig {
  apimBaseUrl: string;
  callingApplication: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export class JsonApiIntegrationWithMsal {
  private readonly auth: MsalAuthorizer;
  private readonly config: JsonApiIntegrationWithMsalConfig;

  constructor(config: JsonApiIntegrationWithMsalConfig) {
    this.config = config;
    this.auth = new MsalAuthorizer(config);
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = {
      ...init.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${await this.auth.getToken()}`,
    };

    return fetch(`${this.config.apimBaseUrl}${path}`, { ...init, headers });
  }
}
