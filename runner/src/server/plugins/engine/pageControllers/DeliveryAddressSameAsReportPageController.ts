import { PageControllerBase } from "./PageControllerBase";
import { HapiRequest, HapiResponseToolkit } from "server/types";

const COMPONENT_SAME_AS_REPORT = "deliveryAddressSameAsReport";
const COMPONENT_DISPLAY = "deliveryAddressSameAsReportDisplay";

export class DeliveryAddressSameAsReportPageController extends PageControllerBase {
  private displayAddress: string = "";

  async onMakeGetRouteHandler(request: HapiRequest) {
    const { cacheService } = request.services([]);
    const currentState = await cacheService.getState(request);
    this.displayAddress = `${currentState.reportAddress_selectedAddress.address}`;
  }

  getViewModel(formData: any, iteration?: any, errors?: any) {
    const viewModel = super.getViewModel(formData, iteration, errors);

    const displayIndex = this.components.items.findIndex(
      (c: any) => c.name === COMPONENT_DISPLAY
    );

    if (displayIndex !== -1 && viewModel.components[displayIndex]?.model) {
      viewModel.components[displayIndex].model.content = this.displayAddress;
    }

    return viewModel;
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const response = await this.handlePostRequest(request, h);
      if (response?.source?.context?.errors) {
        return response;
      }

      const payload = (request.payload || {}) as Record<string, unknown>;
      const sameAsReport = payload[COMPONENT_SAME_AS_REPORT] === "true";

      const { cacheService } = request.services([]);
      const currentState = await cacheService.getState(request);

      if (sameAsReport) {
        const reportAddress = currentState.reportAddress_selectedAddress;

        const savedState = await cacheService.mergeState(request, {
          [COMPONENT_SAME_AS_REPORT]: true,
          deliveryAddress_selectedAddress: reportAddress,
          deliveryAddress_matchedAddress: reportAddress,
          deliveryAddress_isCorrectAddress: true,
          [COMPONENT_DISPLAY]: reportAddress ?? "",
        });

        return this.proceed(request, h, savedState, true);
      }

      const savedState = await cacheService.mergeState(request, {
        [COMPONENT_SAME_AS_REPORT]: false,
        [COMPONENT_DISPLAY]: null,
      });

      return this.proceed(request, h, savedState, false);
    };
  }
}
