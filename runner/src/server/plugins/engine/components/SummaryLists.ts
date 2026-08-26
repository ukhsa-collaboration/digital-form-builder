import { ComponentBase } from "./ComponentBase";
import { FormData, FormSubmissionErrors, FormSubmissionState } from "../types";
import {
  summaryContentToSummaryLists,
  SummaryContentSection,
  SummaryContentOptions,
} from "../summaryContentToSummaryLists";
import { FeesModel } from "../models/submission/FeesModel";
import { FormModel } from "../models";
import { SummaryListsComponent } from "@xgovformbuilder/model";

export class SummaryLists extends ComponentBase {
  sections: SummaryContentSection[];

  constructor(def: SummaryListsComponent, model: FormModel) {
    super(def, model);
    this.sections = Array.isArray(def.content) ? def.content : [];
  }

  getViewModel(formData: FormData, _errors?: FormSubmissionErrors) {
    const options = (this.options ?? {}) as SummaryContentOptions;

    const feesModel = FeesModel(this.model, formData as FormSubmissionState);

    const state: Record<string, any> = feesModel
      ? {
          ...formData,
          fees: feesModel,
        }
      : (formData as Record<string, any>);

    const summaryLists = summaryContentToSummaryLists(
      this.sections,
      state,
      options,
      this.model.conditions,
      this.model.basePath,
      this.model
    );

    return {
      ...super.getViewModel(formData, _errors),
      summaryLists,
    };
  }
}
