import joi from "joi";

import { FormComponent } from "./FormComponent";
import { FormData, FormSubmissionErrors } from "../types";
import { FormModel } from "../models";

export class HiddenField extends FormComponent {
  formSchema;
  stateSchema;

  constructor(def: any, model: FormModel) {
    super(def, model);
    this.options = def.options ?? {};
    this.formSchema = joi.string().optional().allow("").allow(null);
    this.stateSchema = this.formSchema;
  }

  getFormSchemaKeys() {
    return { [this.name]: this.formSchema };
  }

  getStateSchemaKeys() {
    return { [this.name]: this.stateSchema };
  }

  getViewModel(formData: FormData, _errors: FormSubmissionErrors) {
    const { options } = this as any;
    return {
      attributes: {},
      id: this.name,
      name: this.name,
      value: options.value ?? formData[this.name] ?? "",
    };
  }
}
