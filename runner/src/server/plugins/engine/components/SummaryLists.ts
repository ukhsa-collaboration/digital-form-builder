import { ComponentBase } from "./ComponentBase";
import { FormData, FormSubmissionErrors } from "../types";
import {
  summaryContentToSummaryLists,
  SummaryContentSection,
  SummaryContentOptions,
} from "../summaryContentToSummaryLists";

export class SummaryLists extends ComponentBase {
  sections: SummaryContentSection[];

  constructor(def: any, model: any) {
    super(def, model);
    this.sections = Array.isArray(def.content) ? def.content : [];
  }

  getViewModel(formData: FormData, _errors?: FormSubmissionErrors) {
    const options = (this.options ?? {}) as SummaryContentOptions;
    const summaryLists = summaryContentToSummaryLists(
      this.sections,
      formData as Record<string, any>,
      options,
      this.model.conditions,
      this.model.basePath
    );
    return {
      ...super.getViewModel(formData, _errors),
      summaryLists,
    };
  }
}
