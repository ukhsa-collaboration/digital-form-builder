import { HapiRequest, HapiResponseToolkit } from "src/server/types";
import { redirectTo } from "../helpers";
import { PageController } from "./PageController";
import { v4 as uuidv4 } from "uuid";

export class CrossFormSubmitController extends PageController {
  RETRY_TIMEOUT_SECONDS: number;

  constructor(model, pageDef) {
    super(model, pageDef);
    this.RETRY_TIMEOUT_SECONDS = this.model.def.retryTimeoutSeconds ?? 300;
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

      console.log("Current form 2 state:", state);

      const transferId = uuidv4();

      await crossFormCacheService.saveInformationToAllowCrossFormResume(
        request,
        transferId
      );

      console.log("Current form 2 state after saveInfo:", state);

      return redirectTo(
        request,
        h,
        `/${this.model.values.toggleRedirect}/redirect-check-your-details?transferId=${transferId}`
      );
    };
  }
}
