import {
  LookupAddressData,
  lookupAddressRequestSchema,
  LookupResponse,
  StoreReportData,
  storeReportRequestSchema,
  StoreReportResponse,
} from "@xgovformbuilder/model";
import { BaseService } from "./BaseService";
import {
  JsonApiIntegrationWithMsal,
  JsonApiIntegrationWithMsalConfig,
} from "./jsonApiIntegrationWithMsal";
import { postValidated } from "./rpsApiRequest";

export class RiskReportApiService extends BaseService {
  private readonly client: JsonApiIntegrationWithMsal;

  constructor(name: string, config: JsonApiIntegrationWithMsalConfig) {
    super(name);
    this.client = new JsonApiIntegrationWithMsal(name, config);
  }

  async lookupAddress(data: LookupAddressData): Promise<LookupResponse> {
    return postValidated<LookupAddressData, LookupResponse>(
      this.client,
      "/lookup",
      lookupAddressRequestSchema,
      data,
      "database check not successful"
    );
  }

  async storeReport(data: StoreReportData): Promise<StoreReportResponse> {
    return postValidated<StoreReportData, StoreReportResponse>(
      this.client,
      "/storereport",
      storeReportRequestSchema,
      data,
      "Request to save report details has failed"
    );
  }
}
