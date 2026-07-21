import { HapiRequest, HapiServer } from "../types";
import { getDynamicServiceInstanceName } from "../services/dynamicServices";

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
        }),
        { apply: true }
      );
    },
  },
};
