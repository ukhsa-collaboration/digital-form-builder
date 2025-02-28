import { SummaryViewModel } from "../models";
import { PageController } from "./PageController";
import { redirectTo, redirectUrl } from "../helpers";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { HMACAuthService } from "src/server/services/HMACAuthService";

export class MagicLinkController extends PageController {
  hmacAuthService: HMACAuthService;

  constructor(model, pageDef) {
    super(model, pageDef);
    this.hmacAuthService = new HMACAuthService(); // You'll need access to the server object
  }

  makeGetRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      // Validate the token using your HMACAuthService
      const validation = await this.hmacAuthService.validateHmac(request, h);

      if (!validation.isValid) {
        // Handle different invalid token cases
        switch (validation.reason) {
          case "expired":
            return h.redirect("/magic-link/expired").code(302);
          case "invalid_signature":
            return h.redirect("/magic-link/incorrect-email").code(302);
          default:
            return h.redirect("/magic-link/error").code(302);
        }
      }

      this.langFromRequest(request);

      const { cacheService } = request.services([]);
      const model = this.model;

      // @ts-ignore - ignoring so docs can be generated. Remove when properly typed
      if (this.model.def.skipSummary) {
        return this.makePostRouteHandler()(request, h);
      }
      const state = await cacheService.getState(request);
      const viewModel = new SummaryViewModel(this.title, model, state, request);

      if (viewModel.endPage) {
        return redirectTo(
          request,
          h,
          `/${model.basePath}${viewModel.endPage.path}`
        );
      }

      /**
       * iterates through the errors. If there are errors, a user will be redirected to the page
       * with the error with returnUrl=`/${model.basePath}/summary` in the URL query parameter.
       */
      if (viewModel.errors) {
        const errorToFix = viewModel.errors[0];
        const { path } = errorToFix;
        const parts = path.split(".");
        const section = parts[0];
        const property = parts.length > 1 ? parts[parts.length - 1] : null;
        const iteration = parts.length === 3 ? Number(parts[1]) + 1 : null;
        const pageWithError = model.pages.filter((page) => {
          if (page.section && page.section.name === section) {
            let propertyMatches = true;
            let conditionMatches = true;
            if (property) {
              propertyMatches =
                page.components.formItems.filter(
                  (item) => item.name === property
                ).length > 0;
            }
            if (
              propertyMatches &&
              page.condition &&
              model.conditions[page.condition]
            ) {
              conditionMatches = model.conditions[page.condition].fn(state);
            }
            return propertyMatches && conditionMatches;
          }
          return false;
        })[0];
        if (pageWithError) {
          const params = {
            returnUrl: redirectUrl(request, `/${model.basePath}/summary`),
            num: iteration && pageWithError.repeatField ? iteration : null,
          };
          return redirectTo(
            request,
            h,
            `/${model.basePath}${pageWithError.path}`,
            params
          );
        }
      }

      const declarationError = request.yar.flash("declarationError");
      if (declarationError.length) {
        viewModel.declarationError = declarationError[0];
      }
      return h.view("summary", viewModel);
    };
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]);
      const model = this.model;
      const state = await cacheService.getState(request);
      const summaryViewModel = new SummaryViewModel(
        this.title,
        model,
        state,
        request
      );
      this.setFeedbackDetails(summaryViewModel, request);

      // redirect user to start page if there are incomplete form errors
      if (summaryViewModel.result.error) {
        request.logger.error(
          `SummaryPage Error`,
          summaryViewModel.result.error
        );
        /** defaults to the first page */
        // @ts-ignore - tsc reports an error here, ignoring so docs can be generated (does not cause eslint errors otherwise). Remove when properly typed
        let startPageRedirect = redirectTo(
          request,
          h,
          `/${model.basePath}${model.def.pages[0].path}`
        );
        const startPage = model.def.startPage;

        // @ts-ignore - tsc reports an error here, ignoring so docs can be generated (does not cause eslint errors otherwise). Remove when properly typed
        if (startPage.startsWith("http")) {
          // @ts-ignore - tsc reports an error here, ignoring so docs can be generated (does not cause eslint errors otherwise). Remove when properly typed
          startPageRedirect = redirectTo(request, h, startPage);
        } else if (model.def.pages.find((page) => page.path === startPage)) {
          // @ts-ignore - tsc reports an error here, ignoring so docs can be generated (does not cause eslint errors otherwise). Remove when properly typed
          startPageRedirect = redirectTo(
            request,
            h,
            `/${model.basePath}${startPage}`
          );
        }

        return startPageRedirect;
      }

      // Get StatusService
      const { statusService } = request.services([]);

      // Submit the form
      await statusService.outputRequests(request);

      // Redirect to custom page instead of status
      return redirectTo(request, h, `/${request.params.id}/email-confirmed`);
    };
  }
}
