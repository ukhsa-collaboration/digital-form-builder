import { PageController } from "server/plugins/engine/pageControllers/PageController";
import { HapiRequest, HapiResponseToolkit } from "server/types";

export class CrossFormRedirectController extends PageController {
  makeGetRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const id = request.params?.id;
      const forms = request.server?.app?.forms;
      const model = id && forms?.[id];

      // You should define your own magicLinkConfig in your (main) form config
      const crossFormRedirectConfig =
        model?.def?.magicLinkConfig ?? "spike-form-redirect";

      const { crossFormCacheService } = request.services([]);
      /* In order to support resume, we need to store the form id */
      await crossFormCacheService.saveFormIdBeforeCrossFormRedirectToAllowResume(
        request
      );

      return h.redirect(`/${crossFormRedirectConfig}/start`).code(302);
    };
  }
}
