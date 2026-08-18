import { Lifecycle } from "@hapi/hapi";
import { HapiRequest, HapiResponseToolkit } from "server/types";

export type PaymentResult = Record<string, unknown>;

/**
 * The contract every entry in `paymentProviderRegistry` must satisfy.
 * Callers hold a `PaymentProviderService`, never a concrete adapter, so any
 * gateway-specific detail (API shape, redirect vs. rendered HTML) stays
 * inside the adapter and out of the calling controller.
 */
export interface PaymentProviderService {
  createPayment(
    request: HapiRequest,
    state: Record<string, any>,
    feesModel: any,
    model: any
  ): Promise<PaymentResult>;

  redirectUser(
    request: HapiRequest,
    h: HapiResponseToolkit,
    result: PaymentResult
  ): Promise<Lifecycle.ReturnValue>;

  cancelPayment(
    request: HapiRequest,
    state: Record<string, any>
  ): Promise<void>;
}
