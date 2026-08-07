import { HapiRequest, HapiResponseToolkit } from "src/server/types";
import { redirectTo } from "../helpers";
import { PageController } from "./PageController";
import { v4 as uuidv4 } from "uuid";

export class CrossFormSubmitController extends PageController {
  constructor(model, pageDef) {
    super(model, pageDef);
  }

  makeGetRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      return this.makePostRouteHandler()(request, h);
    };
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      this.request = request; // Store request for use in getter methods
      const { cacheService, crossFormCacheService } = request.services([]);
      const state = await cacheService.getState(request);

      const transferId = uuidv4();

      await crossFormCacheService.saveInformationToAllowCrossFormResume(
        request,
        transferId
      );

      console.log("Current form 2 state after saveInfo:", state);

      return redirectTo(
        request,
        h,
        `/${this.model.values.toggleRedirect}/return?transferId=${transferId}`
      );
    };
  }
}
