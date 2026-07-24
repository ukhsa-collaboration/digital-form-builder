import { HapiRequest, HapiResponseToolkit } from "src/server/types";
import { PageController } from "server/plugins/engine/pageControllers/PageController";
import { ControllerError } from "../errors";
import { ViewModel } from "../components/types";

const validRedirectActions = {
  rspRiskReportUpdatePayment: () => {},
};

export class TrustPaymentsPageController extends PageController {
  viewModel: ViewModel | undefined;

  async getRouteHandlerHook(request: HapiRequest) {
    const {
      trustPaymentsService,
      statusService,
      cacheService,
    } = request.services([]);

    console.log("IS THIS RUNNING???");

    if (!trustPaymentsService.verifyRedirect(request)) {
      throw new ControllerError("invalid redirect from trust payments", {
        code: 500,
      });
    }

    const state = cacheService.getState(request);

    console.log("MODEL ::", JSON.stringify(this.model));

    const viewModel = statusService.getViewModel(state, this.model, "?????");
    viewModel.name = this.model.name;
    viewModel.feedbackLink = "http://feedback.example";

    const confirmationTimeout = this.model.def.confirmationSessionTimeout;

    await cacheService.setConfirmationState(
      request,
      { confirmation: viewModel },
      confirmationTimeout
    );

    await cacheService.clearState(request);

    this.viewModel = viewModel;

    // get config to retrive onValidRedirect Method

    // save payment status to database
    // save RPS RISK REPORT
  }

  makeGetRouteHandler() {
    return async (_: HapiRequest, h: HapiResponseToolkit) => {
      return h.view("confirmation", this.viewModel);
    };
  }
}
