import { ConditionRawData } from ".";
import { ComponentDef } from "../components/types";

type Toggleable<T> = boolean | T;

export interface Next {
  path: string;
  condition?: string;
}
export type Link = Next;

export interface Page {
  title: string;
  path: string;
  unauthenticated?: boolean;
  disableBackLink?: boolean;
  controller: string;
  components?: ComponentDef[];
  componentsAfter?: ComponentDef[];
  section?: string; // the section ID
  sectionForExitJourneySummaryPages?: string;
  sectionForMultiSummaryPages?: string;
  sectionForEndSummaryPages?: string;
  sidebarContent?: any;
  next?: { path: string; condition?: string }[];
}

export interface RepeatingFieldPage extends Page {
  controller: "RepeatingFieldPageController";
  options: {
    summaryDisplayMode?: {
      samePage?: boolean;
      separatePage?: boolean;
      hideRowTitles?: boolean;
    };
    customText?: {
      separatePageTitle?: string;
    };
  };
}
export interface CheckpointSummaryPage extends Page {
  controller: "CheckpointSummaryPageController";
  options: {
    customText: any;
  };
}

export interface Section {
  name: string;
  title: string;
  hideTitle: boolean;
}

export interface Item {
  text: string;
  value: string | number | boolean;
  description?: string;
  condition?: string;
}

export interface List {
  name: string;
  title: string;
  type: "string" | "number" | "boolean";
  items: Item[];
}

export interface Feedback {
  feedbackForm?: boolean;
  url?: string;
  emailAddress?: string;
}

export type PhaseBanner = {
  phase?: "alpha" | "beta";
  feedbackUrl?: string;
};

export type MultipleApiKeys = {
  test?: string;
  production?: string;
};

export enum OutputType {
  Email = "email",
  Notify = "notify",
  Webhook = "webhook",
}

export type EmailOutputConfiguration = {
  apiKey: string;
  notifyTemplateId: string;
  emailAddress: string;
};

export type NotifyOutputConfiguration = {
  apiKey: string;
  templateId: string;
  emailField: string;
  personalisation: string[];
  personalisationFieldCustomisation?: {
    [personalisationName: string]: string[];
  };
  addReferencesToPersonalisation?: boolean;
  emailReplyToIdConfiguration?: {
    emailReplyToId: string;
    condition?: string | undefined;
  }[];
  escapeURLs?: boolean;
};

export type WebhookOutputConfiguration = {
  url: string;
  sendAdditionalPayMetadata?: boolean;
  allowRetry?: boolean;
  payload?: Record<string, unknown>;
};

export type OutputConfiguration =
  | EmailOutputConfiguration
  | NotifyOutputConfiguration
  | WebhookOutputConfiguration;

export type Output = {
  name: string;
  title: string;
  type: OutputType;
  outputConfiguration: OutputConfiguration;
};

export type ConfirmationPage = {
  customText: {
    title: string;
    paymentSkipped: Toggleable<string>;
    nextSteps: Toggleable<string>;
    generatedReferenceContent: string;
    referenceTitle: string;
    referenceContent: string;
    hidePanel?: boolean;
  };
  components: ComponentDef[];
};

export type PaymentSkippedWarningPage = {
  customText: {
    title: string;
    caption: string;
    body: string;
  };
};

export type SpecialPages = {
  confirmationPage?: ConfirmationPage;
  paymentSkippedWarningPage?: PaymentSkippedWarningPage;
};

export function isMultipleApiKey(
  payApiKey: string | MultipleApiKeys | undefined
): payApiKey is MultipleApiKeys {
  let obj = payApiKey as MultipleApiKeys;
  return obj.test !== undefined || obj.production !== undefined;
}

export type Fee = {
  description: string;
  amount: number;
  multiplier?: string;
  condition?: string;
  prefix?: string;
};

export type AdditionalReportingColumn = {
  columnName: string;
  fieldPath?: string;
  staticValue?: string;
};

export type FeeOptions = {
  paymentReferenceFormat?: string;
  payReturnUrl?: string;
  allowSubmissionWithoutPayment: boolean;
  maxAttempts: number;
  customPayErrorMessage?: string;
  showPaymentSkippedWarningPage: boolean;
  additionalReportingColumns?: AdditionalReportingColumn[];
  payApiKey?: string | MultipleApiKeys | undefined;
};

export type ExitOptions = {
  url: string;
  redirectUrl?: string;
  format?: "STATE" | "WEBHOOK";
};

export type Analytics = {
  gtmId1: string;
  gtmId2: string;
  matomoId: string;
  matomoUrl: string;
};

export interface MsalAuthorizerConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export interface SecureFormSubmissionConfig extends MsalAuthorizerConfig {
  /* Empty for now */
  useAwsWafUserAgentWorkaround?: boolean;
}

export interface AddressLookupConfig extends MsalAuthorizerConfig {
  apimBaseUrl: string;
  callingApplication: string;
  subscriptionKey?: string;
}

export interface SummaryDeclaration {
  /** Checkbox label rendered on the summary page. */
  label: string;
  /** Overrides the default "You must declare…" flash error when unchecked. */
  errorMessage?: string;
  /** Hides the h2 Declaration heading in the summary page */
  hideDeclarationHeading?: boolean;
}

/**
 * Merges multiple named fields into a single summary row.
 * The resulting row uses `to` as its field name and joins the source values with `joiner`.
 */
export interface SummaryMergeField {
  names: string[];
  to: string;
  joiner: string;
}

/** A synthetic row that can be appended to the last summary section via a conditional rule. */
export interface SummaryAppendSection {
  name: string;
  label: string;
  value: string;
  /** When true the user cannot return to change this value from the summary. */
  immutable?: boolean;
}

export interface SummaryConditionalRowCondition {
  field: string;
  value?: string;
  isEmpty?: boolean;
}

export interface SummaryConditionalRow {
  when: SummaryConditionalRowCondition;
  removeFields?: string[];
  appendToLastSection?: SummaryAppendSection;
}

/**
 * Data-driven configuration for the summary page, set at the form-definition level.
 * Transforms are applied in order: merge → remove → relabel → value transform → conditional rules.
 */
export interface SummaryConfig {
  /** Overrides the default "Confirm and submit" button label. */
  submitLabel?: string;
  declaration?: SummaryDeclaration;
  /** Field names to strip from the summary rows entirely. */
  removeFields?: string[];
  mergeFields?: Array<SummaryMergeField>;
  /** Map of field name → new display label. */
  relabelFields?: Record<string, string>;
  /** Map of field name → { rawValue → replacement display value }. */
  valueTransforms?: Record<string, Record<string, string>>;
  conditionalRows?: Array<SummaryConditionalRow>;
}

/**
 * `FormDefinition` is a typescript representation of `Schema`
 */
export type FormDefinition = {
  formGroup?: string;
  name?: string | undefined;
  pages: Array<Page | RepeatingFieldPage>;
  conditions: ConditionRawData[];
  lists: List[];
  sections: Section[];
  startPage?: Page["path"] | undefined;
  authentication?: boolean | undefined;
  feedback?: Feedback;
  phaseBanner?: PhaseBanner;
  fees: Fee[];
  skipSummary?: boolean | undefined;
  outputs: Output[];
  declaration?: string | undefined;
  metadata?: Record<string, any>;
  payApiKey?: string | MultipleApiKeys | undefined;
  specialPages?: SpecialPages;
  paymentReferenceFormat?: string;
  feeOptions: FeeOptions;
  exitOptions: ExitOptions;
  jwtKey?: string | undefined;
  toggle?: boolean | string | undefined;
  retryTimeoutSeconds?: number | undefined;
  magicLinkConfig?: string | undefined;
  allowedDomains?: string[] | undefined;
  invalidDomainRedirect?: string | undefined;
  analytics?: Analytics;
  webhookHmacSharedKey?: string | undefined;
  fileUploadHmacSharedKey?: string | undefined;
  fullStartPage?: string | undefined;
  serviceName?: string | undefined;
  confirmationSessionTimeout: number | undefined;
  returnTo?: boolean | undefined;
  addressLookupConfig?: AddressLookupConfig;
  error500ContactEmail?: string | undefined;
  summaryConfig?: SummaryConfig;
  generateReference?: boolean | undefined;
};
