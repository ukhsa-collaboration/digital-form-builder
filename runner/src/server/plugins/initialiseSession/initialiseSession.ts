import { Plugin } from "@hapi/hapi";
import { InitialiseSession } from "./types";

export const initialiseSession: Plugin<InitialiseSession> = {
  name: "initialiseSession",
  register: async function (server) {
    server.route({
      method: "POST",
      path: "/session/keep-alive",
      options: {
        auth: false,
      },
      handler: async (request, h) => {
        const { cacheService } = request.services([]);

        // Read existing state
        const state = await cacheService.getState(request);

        if (state) {
          // Re-save without changes → refresh TTL
          await cacheService.mergeState(request, {});
        }

        return h.response().code(204);
      },
    });
  },
};
