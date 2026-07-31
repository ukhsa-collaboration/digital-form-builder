import { HapiRequest, HapiResponseToolkit } from "src/server/types";
import { PageController } from "./PageController";

export class CrossFormReturnController extends PageController {
  constructor(model, pageDef) {
    super(model, pageDef);
  }
  makeGetRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      console.log("CROSS FORM RETURN CONTROLLER HIT");
      const previousState = await request
        .services([])
        .cacheService.getState(request);
      console.log("Previous state", previousState);
      return this.makePostRouteHandler()(request, h);
    };
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      console.log("CROSS FORM RETURN POST HIT");
      const transferId = request.query?.transferId;
      console.log("transferId", transferId);
      const { crossFormCacheService } = request.services([]);
      await crossFormCacheService.restoreInformationFromCrossFormResume(
        request,
        transferId
      );
      console.log(
        "Merged state",
        await request.services([]).cacheService.getState(request)
      );
      return h.redirect(`/${this.model.basePath}/check-your-details`).code(302);
    };
  }
}
