import { PageController } from "./PageController";
import { redirectTo } from "../helpers";
import { FeesModel } from "server/plugins/engine/models/submission";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { ControllerError } from "../errors";
import { gatherRepeatPages } from "server/utils/gatherRepeatPages";
import { paymentProviderRegistry } from "server/services/paymentProviders";
import { runHook } from "server/services/hooks";

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

      const beforeSubmitResponse = await runHook(
        this.constructor.name,
        "onBeforeSubmit",
        request,
        h,
        { model }
      );
      if (beforeSubmitResponse) return beforeSubmitResponse;

      await cacheService.mergeState(request, { userCompletedSummary: true });

      const submitResponse = await runHook(
        this.constructor.name,
        "onSubmit",
        request,
        h,
        { model }
      );
      if (submitResponse) return submitResponse;

      const afterSubmitResponse = await runHook(
        this.constructor.name,
        "onAfterSubmit",
        request,
        h,
        { model }
      );
      if (afterSubmitResponse) return afterSubmitResponse;

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
