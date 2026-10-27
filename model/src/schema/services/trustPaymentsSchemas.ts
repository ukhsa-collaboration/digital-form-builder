import joi from "joi";

export const billingInformationSchema = joi.object({
  billingFirstName: joi.string().required(),
  billingLastName: joi.string().required(),
  billingEmailAddress: joi.string().optional(),
  billingTelephone: joi.string().optional(),
});

export type TrustPaymentsBillingInformation = {
  billingFirstName: string;
  billingLastName: string;
  billingEmailAddress?: string;
  billingTelephone?: string;
};

export type TrustPaymentsDetails = {
  amount: number;
  orderReference: string;
  redirectUrl: string;
  billingTelephone?: string;
} & TrustPaymentsBillingInformation;

export interface TrustPaymentsConfig {
  siteReference: string;
  hashPassword: string;
  successWebhookUrl: string;
  failureWebhookUrl: string;
}
