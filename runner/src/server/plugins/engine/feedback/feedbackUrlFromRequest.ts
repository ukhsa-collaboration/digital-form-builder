import { FormModel } from "../models";
import { FeedbackContextInfo } from "./FeedbackContextInfo";
import { RelativeUrl } from "./RelativeUrl";

export function feedbackUrlFromRequest(
  request: { url: { pathname: string; search: string } },
  form: FormModel | undefined,
  pageTitle: string
): string | void {
  if (!form) {
    return undefined;
  }

  const feedback = form.def.feedback;

  if (feedback?.emailAddress) {
    return `mailto:${feedback.emailAddress}`;
  }

  if (feedback?.url) {
    if (feedback.url.startsWith("http")) {
      return feedback.url;
    }

    const relativeFeedbackUrl = new RelativeUrl(feedback.url);
    const returnInfo = new FeedbackContextInfo(
      form.name,
      pageTitle,
      `${request.url.pathname}${request.url.search}`
    );
    relativeFeedbackUrl.setParam(
      RelativeUrl.FEEDBACK_RETURN_INFO_PARAMETER,
      returnInfo.toString()
    );
    return relativeFeedbackUrl.toString();
  }

  return undefined;
}
