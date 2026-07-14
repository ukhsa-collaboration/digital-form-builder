import { FormData, FormSubmissionErrors } from "../types";
import nunjucks from "nunjucks";
import { Para } from "./Para";

export class DisplayAddress extends Para {
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const options: any = this.options;

    const content = nunjucks.renderString(this.content, { ...formData });

    const viewModel = {
      ...super.getViewModel(formData, errors),
      content,
    };

    if (options.condition) {
      viewModel.condition = options.condition;
    }

    return viewModel;
  }
}
