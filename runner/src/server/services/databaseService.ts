import { MsalAuthorizer } from "./msalAuthorizerService";
import { AddressLookupConfig } from "@xgovformbuilder/model";

export class DatabaseService {
  private readonly auth: MsalAuthorizer;
  private readonly config: AddressLookupConfig;

  constructor(config: AddressLookupConfig) {
    this.config = config;
    this.auth = new MsalAuthorizer(config);
  }

  async databaseCheck(uprn: string): Promise<boolean> {
    return true;
  }
}
