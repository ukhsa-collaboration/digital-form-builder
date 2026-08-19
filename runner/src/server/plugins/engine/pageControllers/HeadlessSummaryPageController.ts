import { PageController } from "./PageController";
import { redirectTo } from "../helpers";
import { FeesModel } from "server/plugins/engine/models/submission";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { ControllerError } from "../errors";
import { gatherRepeatPages } from "server/utils/gatherRepeatPages";
import { paymentProviderRegistry } from "server/services/paymentProviders";
import { runHook } from "server/services/hooks";
import { v4 as uuidv4 } from "uuid";

/**
 * A summary controller for forms that have no summary *view* — there is no
 * declaration checkbox, no webhook, no per-provider payment branching inline
 * here. It exists to keep that stripped-down path from having to fork
 * {@link SummaryPageController}, which grows a new `if` branch (or subclass)
 * every time a form needs a different submit side effect or payment provider.
 *
 * The aim: keep this controller's own logic to the minimum every form
 * on this path needs — validate the gathered state, mark the summary
 * complete, decide whether payment is due — and push everything
 * form-specific out to two indirections instead of growing the class:
 *
 * - **Hooks** (`onBeforeSubmit` / `onSubmit` / `onAfterSubmit`, run via
 *   {@link runHook}): form-specific side effects (e.g. posting to a backend
 *   service) are configured per-form in the form definition's `hooks` block
 *   and looked up in `hookRegistry` by name. Any of the three may return a
 *   Hapi response to short-circuit the submit flow (e.g. to show a bespoke
 *   error page); returning `undefined` lets it continue.
 * - **Payment provider adapters** (`paymentProviderRegistry`): payment
 *   creation and redirect behaviour is delegated to whichever
 *   `PaymentProviderService` implementation matches `model.def.paymentProvider`,
 *   rather than being an `if (provider === ...)` chain in this controller.
 *
 * New form-specific behaviour should be added as a new hook or a new payment
 * adapter, not as new branches or overrides here. If a form needs behaviour
 * that doesn't fit either extension point, that's a signal the extension
 * points themselves need to grow, not this controller i.e. make a new extension
 * point, keep the implementation minimal in this controller, extract all logic
 * to hooks or adapters.
 */
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

      // Extension point: form-specific side effects live in
      // hookRegistry, configured per-form, not as new logic in this method.
      const beforeSubmitResponse = await runHook(
        this.constructor.name,
        "onBeforeSubmit",
        request,
        h,
        { model }
      );

      if (beforeSubmitResponse) return beforeSubmitResponse;

      if (model.def?.generateReference == true) {
        const reference = uuidv4();
        await cacheService.mergeState(request, {
          generatedReference: reference,
        });
      }

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

      // Extension point: payment behaviour is delegated to whichever adapter
      // matches the form's configured provider, not branched on here.
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
