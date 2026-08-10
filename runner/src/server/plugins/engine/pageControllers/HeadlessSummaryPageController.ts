import { SummaryConfig } from "@xgovformbuilder/model";
import { PageController } from "./PageController";
import { redirectTo } from "../helpers";
import { FeesModel } from "server/plugins/engine/models/submission";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { ControllerError } from "../errors";
import { gatherRepeatPages } from "server/utils/gatherRepeatPages";
import {
  onBeforeSubmitRegistry,
  onSubmitRegistry,
  onAfterSubmitRegistry,
  runHook,
} from "server/services/summaryLifecycle";
import { paymentProviderRegistry } from "server/services/paymentProviders";

export class HeadlessSummaryPageController extends PageController {
  makeGetRouteHandler() {
    const renderPage = super.makeGetRouteHandler();

    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      this.langFromRequest(request);

      const { cacheService } = request.services([]);
      const model = this.model;
      const state = await cacheService.getState(request);

      const { relevantPages, endPage } = model.getRelevantPages(state);
      const pagesBeforeSummary = relevantPages.filter((page) => page !== this);

      if (endPage && endPage !== this) {
        return h.redirect(`/${model.basePath}${(endPage as any).path}`);
      }

      const schema = model.makeFilteredSchema(state, pagesBeforeSummary);
      const result = schema.validate(gatherRepeatPages(state), {
        abortEarly: false,
        stripUnknown: true,
      });

      if (result.error) {
        const firstDetail = result.error.details[0];
        const fieldName = firstDetail.path[
          firstDetail.path.length - 1
        ] as string;

        const pageWithError = pagesBeforeSummary.find((page) =>
          page.components.formItems.some(
            (item: { name: string }) => item.name === fieldName
          )
        );

        if (pageWithError) {
          return h.redirect(
            `/${model.basePath}${
              pageWithError.path
            }?returnUrl=${encodeURIComponent(`/${model.basePath}/summary`)}`
          );
        }
      }

      return renderPage(request, h);
    };
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]);
      const model = this.model;
      const summaryConfig: SummaryConfig = model.def.summaryConfig ?? {};

      const response = await this.handlePostRequest(request, h);

      if (response?.source?.context?.errors) {
        return response;
      }

      const state = await cacheService.getState(request);

      const { relevantPages } = model.getRelevantPages(state);
      const schema = model.makeFilteredSchema(state, relevantPages);
      const result = schema.validate(gatherRepeatPages(state), {
        abortEarly: false,
        stripUnknown: true,
      });

      if (result.error) {
        request.logger.error(
          "PluggableSummaryPage validation error",
          result.error
        );
        return this.redirectToStartPage(request, h, model);
      }

      if (summaryConfig.onBeforeSubmit) {
        const hookResponse = await runHook(
          onBeforeSubmitRegistry,
          summaryConfig.onBeforeSubmit.action,
          request,
          state
        );
        if (hookResponse) return hookResponse;
      }

      await cacheService.mergeState(request, { userCompletedSummary: true });

      if (summaryConfig.onSubmit) {
        const hookResponse = await runHook(
          onSubmitRegistry,
          summaryConfig.onSubmit.action,
          request,
          state
        );
        if (hookResponse) return hookResponse;
      }

      if (summaryConfig.onAfterSubmit) {
        const hookResponse = await runHook(
          onAfterSubmitRegistry,
          summaryConfig.onAfterSubmit.action,
          request,
          state
        );
        if (hookResponse) return hookResponse;
      }

      const feesModel = FeesModel(model, state);

      if (!model.def.paymentProvider || !feesModel?.details?.length) {
        return redirectTo(request, h, `/${request.params.id}/status`);
      }

      const paymentService = paymentProviderRegistry[model.def.paymentProvider];

      if (!paymentService) {
        throw new ControllerError(
          `Unknown payment provider '${model.def.paymentProvider}'`,
          { code: 500 }
        );
      }

      const paymentResult = await paymentService.createPayment(
        request,
        state,
        feesModel,
        model
      );

      return paymentService.redirectUser(request, h, paymentResult);
    };
  }

  private redirectToStartPage(
    _request: HapiRequest,
    h: HapiResponseToolkit,
    model: any
  ) {
    const startPage = model.def.startPage;

    if (typeof startPage === "string" && startPage.startsWith("http")) {
      return h.redirect(startPage);
    }

    if (model.def.pages.find((page: any) => page.path === startPage)) {
      return h.redirect(`/${model.basePath}${startPage}`);
    }

    return h.redirect(`/${model.basePath}${model.def.pages[0].path}`);
  }

  get postRouteOptions() {
    return {
      ext: {
        onPreHandler: {
          method: async (_request: HapiRequest, h: HapiResponseToolkit) => {
            return h.continue;
          },
        },
      },
    };
  }
}
