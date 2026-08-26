import config from "server/config";
import { isMultipleApiKey } from "@xgovformbuilder/model";
import { ControllerError } from "server/plugins/engine/errors";
import { BaseService } from "../BaseService";
import { PaymentProviderService, PaymentResult } from "./types";
import { FormModel } from "src/server/plugins/engine/models";

/**
 * Each payment provider is an adapter implementing the common
 * {@link PaymentProviderService} contract, keyed by the provider id used
 * in a form's `paymentProvider` definition. Callers
 * (e.g. `HeadlessSummaryPageController`) resolve the adapter by that id
 * and call through the interface — they never know or care which gateway
 * is behind it, so adding a provider never means touching a caller's
 * `if (provider === ...)` chain.
 *
 * To add a provider: write an adapter class implementing
 * `PaymentProviderService`, then add it to `paymentProviderRegistry` below
 * under its id. Nothing outside this file should change.
 */

type GovUkPayAdapterService = PaymentProviderService<{
  redirectUrl: string;
  reference: string;
}>;

/** Adapter for GOV.UK Pay, registered under `"gov-uk-pay"`. */
class GovUkPayAdapter extends BaseService implements GovUkPayAdapterService {
  constructor() {
    super("GovUkPayAdapter");
  }

  async createPayment(
    ...[request, _state, feesModel, model]: Parameters<
      GovUkPayAdapterService["createPayment"]
    >
  ) {
    this.logger.trace({ formId: request.params.id }, "createPayment start");

    const { payService, cacheService } = request.services([]);

    const payApiKey = this.resolvePayApiKey(model);
    const payReturnUrl = model.feeOptions?.payReturnUrl ?? config.payReturnUrl;
    const returnUrl = new URL(
      `${payReturnUrl}/${request.params.id}/status`
    ).toString();

    this.logger.info(`payReturnUrl configured to ${payReturnUrl}`);

    const payStateMeta = payService.createPayStateMeta({
      feesModel,
      payApiKey,
      url: returnUrl,
    });

    const res = await payService.payRequestFromMeta(payStateMeta);

    const payState = {
      pay: {
        payId: res.payment_id,
        reference: res.reference,
        self: res._links.self.href,
        next_url: res._links.next_url.href,
        returnUrl,
        meta: payStateMeta,
      },
    };

    request.yar.set("basePath", model.basePath);
    await cacheService.mergeState(request, payState);

    this.logger.trace(
      { paymentId: res.payment_id, reference: res.reference },
      "createPayment complete"
    );

    return {
      redirectUrl: payState.pay.next_url,
      reference: res.reference,
    };
  }

  async redirectUser(
    ...[_request, h, result]: Parameters<GovUkPayAdapterService["redirectUser"]>
  ) {
    return h.redirect(result.redirectUrl);
  }

  async cancelPayment(
    ...[_request, _state]: Parameters<GovUkPayAdapterService["cancelPayment"]>
  ): Promise<void> {}

  private resolvePayApiKey(model: FormModel): string {
    const modelDef = model.def;
    const payApiKey = modelDef.feeOptions?.payApiKey ?? modelDef.payApiKey;

    if (isMultipleApiKey(payApiKey)) {
      return payApiKey[config.apiEnv] ?? payApiKey.test ?? payApiKey.production;
    }
    return payApiKey ?? "";
  }
}

type TrustPaymentsAdapterService = PaymentProviderService<{
  html: string;
}>;

/** Adapter for Trust Payments, registered under `"trust-payments"`. */
class TrustPaymentsAdapter
  extends BaseService
  implements TrustPaymentsAdapterService {
  constructor() {
    super("TrustPaymentsAdapter");
  }

  async createPayment(
    ...[request, state, feesModel, _model]: Parameters<
      TrustPaymentsAdapterService["createPayment"]
    >
  ) {
    this.logger.trace({ formId: request.params.id }, "createPayment start");

    const { trustPaymentsService } = request.service.getServices(
      "trustPaymentsService"
    );

    if (!trustPaymentsService) {
      throw new ControllerError("cannot find trust payments service", {
        code: 500,
      });
    }

    const url = new URL(request.url);
    const redirectUrl = `${url.origin}/${request.params.id}/status`;

    if (
      typeof state["firstName"] !== "string" ||
      typeof state["lastName"] !== "string"
    ) {
      throw new ControllerError("invalid billing first name & last name", {
        code: 500,
      });
    }

    const html = await trustPaymentsService.createTrustPaymentsForm({
      billingFirstName: state["firstName"] ?? "",
      billingLastName: state["lastName"] ?? "",
      amount: feesModel.total,
      redirectUrl,
    });

    this.logger.trace({ formId: request.params.id }, "createPayment complete");

    return { html };
  }

  async redirectUser(
    ...[_request, h, result]: Parameters<
      TrustPaymentsAdapterService["redirectUser"]
    >
  ) {
    return h.response(result.html).type("text/html");
  }

  async cancelPayment(
    ...[_request, _state]: Parameters<
      TrustPaymentsAdapterService["cancelPayment"]
    >
  ): Promise<void> {}

  async verifyRedirect(
    ...[request]: Parameters<
      NonNullable<TrustPaymentsAdapterService["verifyRedirect"]>
    >
  ): Promise<void> {
    const { trustPaymentsService } = request.service.getServices(
      "trustPaymentsService"
    );

    const paymentErrorStatus = request.query["errorcode"];
    const model = request.server.app.forms[request.params.id];

    if (
      !trustPaymentsService.verifyRedirect(request) ||
      (paymentErrorStatus && paymentErrorStatus !== "0")
    ) {
      await request.hook.run("TrustPaymentsService.onInvalidPayment", {
        model,
      });

      throw new ControllerError("cannot verify trust payment redirect", {
        code: 500,
      });
    }

    await request.hook.run("TrustPaymentsService.onValidPayment", { model });
  }
}

/** The lookup table callers resolve `model.def.paymentProvider` against. */
export const paymentProviderRegistry: Record<string, PaymentProviderService> = {
  "gov-uk-pay": new GovUkPayAdapter(),
  "trust-payments": new TrustPaymentsAdapter(),
};

export type { PaymentProviderService, PaymentResult };
