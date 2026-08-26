import { Lifecycle } from "@hapi/hapi";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import { FormModel } from "src/server/plugins/engine/models";
import { FeesModel } from "src/server/plugins/engine/models/submission";

export type PaymentResult = Record<string, unknown>;

/**
 * The contract every entry in `paymentProviderRegistry` must satisfy.
 * Callers hold a `PaymentProviderService`, never a concrete adapter, so any
 * gateway-specific detail (API shape, redirect vs. rendered HTML) stays
 * inside the adapter and out of the calling controller.
 */
export interface PaymentProviderService<T = PaymentResult> {
  createPayment(
    request: HapiRequest,
    state: Record<string, unknown>,
    feesModel: FeesModel,
    model: FormModel
  ): Promise<T>;

  redirectUser(
    request: HapiRequest,
    h: HapiResponseToolkit,
    result: T
  ): Promise<Lifecycle.ReturnValue>;

  cancelPayment(
    request: HapiRequest,
    state: Record<string, unknown>
  ): Promise<void>;

  verifyRedirect?(request: HapiRequest): Promise<void>;
}
