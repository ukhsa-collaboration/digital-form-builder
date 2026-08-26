import { BaseService } from "./BaseService";
import { MsalAuthorizer } from "./msalAuthorizerService";
import { AddressLookupConfig } from "@xgovformbuilder/model";

export interface AddressLookupOptions {
  maxResults?: number;
  fuzzy?: boolean;
  dataset?: "DPA" | "LPI";
}

export interface Address {
  address: string;
  postcode: string;
  udprn: string;
  uprn: string;
  countryCode: string;
}

export interface AddressLookupResponse {
  addresses: Address[];
}

export class AddressLookupService extends BaseService {
  private readonly auth: MsalAuthorizer;
  private readonly config: AddressLookupConfig;

  constructor(_, config: AddressLookupConfig) {
    super(`addressLookupService.${config.callingApplication}`);

    this.config = config;
    this.auth = new MsalAuthorizer(config);
  }

  async lookupByPostcode(
    postcode: string,
    {
      maxResults = 100,
      fuzzy = false,
      dataset = "DPA",
    }: AddressLookupOptions = {}
  ): Promise<AddressLookupResponse> {
    const params = new URLSearchParams({
      operationId: "matchAddress",
      callingApplication: this.config.callingApplication,
      address: postcode.replace(/\s/g, ""),
      maxResults: String(maxResults),
      fuzzy: String(fuzzy),
      dataset,
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.auth.getToken()}`,
      ...(this.config.subscriptionKey && {
        "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
      }),
    };

    const url = `${this.config.apimBaseUrl}/matchAddress?${params}`;

    this.logger.trace(
      { url, headers },
      "AddressLookupService.lookupByPostcode.request"
    );

    const response = await fetch(url, { headers });

    const body = await response.json();

    this.logger.trace(
      {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body,
      },
      "AddressLookupService.lookupByPostcode.response"
    );

    if (!response.ok) {
      throw new Error(
        `Location lookup failed with status code ${response.status}`
      );
    }

    return {
      addresses: body.matchedAddresses.map(
        (item: any): Address => ({
          address: item.addressString,
          postcode: item.postcode,
          udprn: item.udprn,
          uprn: item.uprn,
          countryCode: item.countryCode,
        })
      ),
    };
  }
}
