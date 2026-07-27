import { PageControllerBase } from "./PageControllerBase";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { FormModel, SummaryViewModel } from "../models";
import { submitActionRegistry } from "server/services/submitActions";
import { ControllerError } from "../errors";

export class PageController extends PageControllerBase {
  constructor(model: FormModel, pageDef: any) {
    super(model, pageDef);
  }

  /**
   * Runs the summary page's configured `summaryConfig.onSubmit` action, if any.
   * Returning a Hapi response from the action short-circuits the caller's submit
   * handler; returning `undefined` means the normal submit flow should continue.
   */
  async runOnSubmitAction(
    request: HapiRequest,
    h: HapiResponseToolkit,
    summaryViewModel: SummaryViewModel
  ) {
    const onSubmit = this.model.def.summaryConfig?.onSubmit;
    if (!onSubmit) return undefined;

    const action = submitActionRegistry[onSubmit.action];

    if (!action) {
      throw new ControllerError(
        `Unknown summary onSubmit action '${onSubmit.action}'`,
        {
          code: 500,
        }
      );
    }

    return action(request, h, {
      model: this.model,
      summaryViewModel,
      parameters: onSubmit.parameters,
    });
  }

  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get getRouteOptions(): {
    ext: any;
  } {
    return {
      ext: {
        onPostHandler: {
          method: (_request: HapiRequest, h: HapiResponseToolkit) => {
            return h.continue;
          },
        },
      },
    };
  }
  /**
   * {@link https://hapi.dev/api/?v=20.1.2#route-options}
   */
  get postRouteOptions(): {
    payload?: any;
    ext: any;
  } {
    return {
      payload: {
        output: "stream",
        parse: true,
        maxBytes: Number.MAX_SAFE_INTEGER,
        failAction: "ignore",
      },
      ext: {
        onPreHandler: {
          method: async (request: HapiRequest, h: HapiResponseToolkit) => {
            const { uploadService } = request.services([]);
            return uploadService.handleUploadRequest(request, h, this.pageDef);
          },
        },
        onPostHandler: {
          method: async (_request: HapiRequest, h: HapiResponseToolkit) => {
            return h.continue;
          },
        },
      },
    };
  }
}
