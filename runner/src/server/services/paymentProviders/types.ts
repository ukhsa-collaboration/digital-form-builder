import { Lifecycle } from "@hapi/hapi";
import { HapiRequest, HapiResponseToolkit } from "server/types";

export type PaymentResult = Record<string, unknown>;

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
