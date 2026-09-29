import {
  saveGasTestKitDetailsSchema,
  StoreGtkData,
  StoreGtkResponse,
} from "@xgovformbuilder/model";
import { BaseService } from "./BaseService";
import {
  JsonApiIntegrationWithMsal,
  JsonApiIntegrationWithMsalConfig,
} from "./jsonApiIntegrationWithMsal";
import { postValidated } from "./rpsApiRequest";

export class GasTestKitApiService extends BaseService {
  private readonly client: JsonApiIntegrationWithMsal;

  constructor(name: string, config: JsonApiIntegrationWithMsalConfig) {
    super(name);
    this.client = new JsonApiIntegrationWithMsal(name, config);
  }

  async storeGtk(data: StoreGtkData): Promise<StoreGtkResponse> {
    return postValidated<StoreGtkData, StoreGtkResponse>(
      this.client,
      "/storegtk",
      saveGasTestKitDetailsSchema,
      data,
      "Request to save gas test kit details has failed"
    );
  }
}
