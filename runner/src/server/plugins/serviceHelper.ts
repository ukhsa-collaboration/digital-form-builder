import { HapiRequest, HapiServer } from "../types";
import { getDynamicServiceInstanceName } from "../services/dynamicServices";
import { ControllerError } from "./engine/errors";

export default {
  plugin: {
    name: "serviceHelper",
    register: (server: HapiServer) => {
      server.decorate(
        "request",
        "service",
        (request: HapiRequest) => ({
          getName: (name: string) =>
            getDynamicServiceInstanceName(request.params?.id, name),
          getServices: (...servicesNames: string[]) => {
            const services = request.services([]);

            const resolved: Record<string, unknown> = {};

            for (const serviceName of servicesNames) {
              // find instanced service
              const instancedServiceName = request.service.getName(serviceName);

              const instancedService = services[instancedServiceName];

              if (instancedService) {
                resolved[serviceName] = instancedService;
                continue;
              }

              // find global service
              const globalService = services[serviceName];

              if (globalService) {
                resolved[serviceName] = globalService;
                continue;
              }

              throw new ControllerError(`cannot find ${serviceName} service`, {
                code: 500,
              });
            }

            return resolved;
          },
        }),
        { apply: true }
      );
    },
  },
};
