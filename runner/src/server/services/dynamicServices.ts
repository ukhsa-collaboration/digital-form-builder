import Schmervice from "schmervice";
import { DynamicServiceConfig } from "@xgovformbuilder/model";

import { HapiServer } from "../types";
import { JsonApiIntegrationWithMsal } from "./jsonApiIntegrationWithMsal";
import { AddressLookupService } from "./addressLookupService";
import { TrustPaymentsService } from "./trustPaymentsService";

type ServiceConstructor = new (parameters: any) => unknown;

const serviceRegistry: Record<string, ServiceConstructor> = {
  jsonApiIntegrationWithMsal: JsonApiIntegrationWithMsal,
  addressLookupService: AddressLookupService,
  trustPaymentsService: TrustPaymentsService,
};

export const getDynamicServiceInstanceName = (formId: string, name: string) =>
  `dynamicServiceInstance:${formId}:${name}`;

export interface IDynamicServices {
  registerServices(
    server: HapiServer,
    formId: string,
    services: DynamicServiceConfig[] | undefined,
    registeredNames: Set<string>
  ): Promise<void>;
}

export class DynamicServices implements IDynamicServices {
  async registerServices(
    server: HapiServer,
    formId: string,
    services: DynamicServiceConfig[] | undefined,
    registeredNames: Set<string>
  ): Promise<void> {
    if (!services) return;

    for (const serviceConfig of services) {
      const instanceName = getDynamicServiceInstanceName(
        formId,
        serviceConfig.name
      );
      if (registeredNames.has(instanceName)) continue;

      const ServiceClass = serviceRegistry[serviceConfig.service];
      if (!ServiceClass) {
        throw new Error(
          `Unknown dynamic service type '${serviceConfig.service}' for '${serviceConfig.name}'`
        );
      }

      const instance = new ServiceClass(serviceConfig.parameters);

      await server.registerService(Schmervice.withName(instanceName, instance));

      registeredNames.add(instanceName);
    }
  }
}
