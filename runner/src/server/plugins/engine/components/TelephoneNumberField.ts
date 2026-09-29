import { TelephoneNumberFieldComponent } from "@xgovformbuilder/model";

import { FormComponent } from "./FormComponent";
import { FormModel } from "../models";
import { addClassOptionIfNone } from "./helpers";
import {
  internationalPhoneValidator,
  ukPhoneValidator,
  ukAndInternationalValidator,
} from "./telephoneHelpers";
import { FormData, FormSubmissionErrors } from "../types";
import joi, { Schema } from "joi";

const PATTERN = /^[0-9\\\s+()-]*$/;
const DEFAULT_MESSAGE = "Enter a telephone number in the correct format";
export class TelephoneNumberField extends FormComponent {
  constructor(def: TelephoneNumberFieldComponent, model: FormModel) {
    super(def, model);

    const { options = {}, schema = {} } = def;
    const pattern = schema.regex ? new RegExp(schema.regex) : PATTERN;
    let componentSchema = joi.string();

    if (options.required === false) {
      componentSchema = componentSchema.allow("").allow(null);
    }
    componentSchema = componentSchema
      .pattern(pattern)
      .label(def.title.toLowerCase());

    if (schema.max) {
      componentSchema = componentSchema.max(schema.max);
    }

    if (schema.min) {
      componentSchema = componentSchema.min(schema.min);
    }

    if (options.isInternationalOnly) {
      componentSchema = componentSchema.custom(internationalPhoneValidator);
    } else if (options.isUKOnly) {
      componentSchema = componentSchema.custom(ukPhoneValidator);
    } else {
      componentSchema = componentSchema.custom(ukAndInternationalValidator);
    }

    componentSchema = componentSchema.messages({
      "string.pattern.base": DEFAULT_MESSAGE,
      "string.empty": DEFAULT_MESSAGE,
      INVALID_COUNTRY_CODE: `${def.title} is not valid because invalid country calling code`,
      NOT_A_NUMBER: `${def.title} is not valid because the string supplied did not seem to be a phone number`,
      TOO_SHORT_AFTER_IDD: `${def.title} is not valid because phone number too short after IDD`,
      TOO_SHORT_NSN: `${def.title} is not valid because the string supplied is too short to be a phone number`,
      TOO_SHORT: `${def.title} is not valid because the string supplied is too short to be a phone number`,
      TOO_LONG: `${def.title} is not valid because the string supplied is too long to be a phone number`,
      IS_POSSIBLE_LOCAL_ONLY: DEFAULT_MESSAGE,
      INVALID_LENGTH: DEFAULT_MESSAGE,
      INVALID_NUMBER: DEFAULT_MESSAGE,
      NON_UK_NUMBER: DEFAULT_MESSAGE,
      ...(options.customValidationMessages || {}),
    });

    this.schema = componentSchema;
    addClassOptionIfNone(this.options, "govuk-input--width-20");
  }

  getFormSchemaKeys() {
    return { [this.name]: this.schema as Schema };
  }

  getStateSchemaKeys() {
    return { [this.name]: this.schema as Schema };
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = {
      ...super.getViewModel(formData, errors),
      type: "tel",
      autocomplete: "tel",
    };

    return viewModel;
  }
}
