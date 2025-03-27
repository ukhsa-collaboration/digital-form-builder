import { parseISO, format } from "date-fns";
import { InputFieldsComponentsDef } from "@xgovformbuilder/model";

import { FormComponent } from "./FormComponent";
import { ComponentCollection } from "./ComponentCollection";
import { optionalText } from "./constants";
import * as helpers from "./helpers";
import {
  FormData,
  FormPayload,
  FormSubmissionErrors,
  FormSubmissionState,
} from "../types";
import { FormModel } from "../models";
import { DataType } from "server/plugins/engine/components/types";

export class DatePartsField extends FormComponent {
  children: ComponentCollection;
  dataType = "date" as DataType;

  constructor(def: InputFieldsComponentsDef, model: FormModel) {
    super(def, model);
    console.log("Constructor options:", this.options);

    const { name, options } = this;

    const isRequired =
      "required" in options && options.required === false ? false : true;
    const optionalText = "optionalText" in options && options.optionalText;
    this.children = new ComponentCollection(
      [
        {
          type: "NumberField",
          name: `${name}__day`,
          title: "Day",
          schema: { min: 1, max: 31, integer: true },
          options: {
            required: isRequired,
            optionalText: optionalText,
            classes: "govuk-input--width-2",
            customValidationMessages: {
              "number.min": "{{#label}} must be between 1 and 31",
              "number.max": "{{#label}} must be between 1 and 31",
              "number.required": `${def.errorLabel} must include a day`,
              "number.base": `${def.errorLabel} must be a real date`,
            },
          },
          hint: "",
        },
        {
          type: "NumberField",
          name: `${name}__month`,
          title: "Month",
          schema: { min: 1, max: 12, integer: true },
          options: {
            required: isRequired,
            optionalText: optionalText,
            classes: "govuk-input--width-2",
            customValidationMessages: {
              "number.min": "{{#label}} must be between 1 and 12",
              "number.max": "{{#label}} must be between 1 and 12",
              "number.required": `${def.errorLabel} must include a year`,
              "number.base": `${def.errorLabel} must be a real date`,
            },
          },
          hint: "",
        },
        {
          type: "NumberField",
          name: `${name}__year`,
          title: "Year",
          schema: { min: 1000, max: 3000, integer: true },
          options: {
            required: isRequired,
            optionalText: optionalText,
            classes: "govuk-input--width-4",
            customValidationMessages: {
              "number.required": `${def.errorLabel} must include a year`,
              "number.base": `${def.errorLabel} must be a real date`,
            },
          },
          hint: "",
        },
      ],
      model
    );

    this.stateSchema = helpers.buildStateSchema("date", this);
  }

  getFormSchemaKeys() {
    return this.children.getFormSchemaKeys();
  }

  getStateSchemaKeys() {
    const { options, name } = this;
    const { maxDaysInPast, maxDaysInFuture } = options as any;
    let schema: any = this.stateSchema;

    console.log("options", options);
    console.log("maxDaysInFuture", maxDaysInFuture);

    // Custom validator to check if all fields are empty
    schema = schema.custom((value, helpers) => {
      // If the value is null or undefined, it means no date was entered
      if (value === null || value === undefined) {
        // Check the individual field values
        const day = helpers.state[`${name}__day`];
        const month = helpers.state[`${name}__month`];
        const year = helpers.state[`${name}__year`];

        // If all fields are empty (null, undefined, or empty string)
        if (!day && !month && !year) {
          // Return an error if the field is required
          if (options.required !== false) {
            return helpers.error(`${name}.dayMonthYear`, {
              label: `${options.errorLabel || name}`,
              message: `Please enter a date`,
            });
          }
        }
      }

      // Existing date range validation
      if (maxDaysInPast !== undefined || maxDaysInFuture !== undefined) {
        console.log("Applying date validator:", maxDaysInFuture, maxDaysInPast);

        schema = schema.custom(
          helpers.getCustomDateValidator(maxDaysInPast, maxDaysInFuture),
          "date range validation"
        );
      }

      return value;
    }, "all fields empty validation");

    // Apply custom validation messages if available
    if (options.customValidationMessages) {
      schema = schema.messages(options.customValidationMessages);
    }

    const schemaDescribe = schema.describe();
    console.log("schema", JSON.stringify(schemaDescribe, null, 2));
    this.schema = schema;
    return { [this.name]: schema };
  }

  getFormDataFromState(state: FormSubmissionState) {
    const name = this.name;
    const value = state[name];
    const dateValue = new Date(value);

    return {
      [`${name}__day`]: value && dateValue.getDate(),
      [`${name}__month`]: value && dateValue.getMonth() + 1,
      [`${name}__year`]: value && dateValue.getFullYear(),
    };
  }

  getStateValueFromValidForm(payload: FormPayload) {
    const name = this.name;
    const day = payload[`${name}__day`];
    const month = payload[`${name}__month`];
    const year = payload[`${name}__year`];

    // If any of the date parts are missing, return null
    if (!day || !month || !year) {
      return null;
    }

    // Helper function to check if a value contains non-numeric characters
    const hasNonNumericChars = (val: any) => {
      return (
        val !== null &&
        val !== undefined &&
        typeof val === "string" &&
        /[^0-9]/.test(val.trim())
      );
    };

    // If fields have non-numeric characters
    if (
      hasNonNumericChars(day) ||
      hasNonNumericChars(month) ||
      hasNonNumericChars(year)
    ) {
      // Return an error if non-numeric characters are found
      return helpers.error(`number.base`, {
        label: `non-numeric characters`,
        message: `Please enter only numeric values for the date`,
      });
    }

    // Convert to Date object (month is 0-indexed)
    const date = new Date(year, month - 1, day);

    // Check if the reconstructed date matches the input
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 || // Convert back to 1-indexed
      date.getDate() !== day
    ) {
      console.error("Invalid date detected:", { day, month, year });
      return null; // Invalid date
    }

    return date; // Valid date
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    const name = this.name;
    const value = state[name];
    return value ? format(parseISO(value), "d MMMM yyyy") : "";
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors);

    // Use the component collection to generate the subitems
    const componentViewModels = this.children
      .getViewModel(formData, errors)
      .map((vm) => vm.model);

    componentViewModels.forEach((componentViewModel) => {
      // Nunjucks macro expects label to be a string for this component
      componentViewModel.label = componentViewModel.label?.text?.replace(
        optionalText,
        ""
      ) as any;

      if (componentViewModel.errorMessage) {
        componentViewModel.classes += " govuk-input--error";
      }
    });

    const relevantErrors =
      errors?.errorList?.filter((error) => error.path.includes(this.name)) ??
      [];
    const firstError = relevantErrors[0];
    const errorMessage = firstError && { text: firstError?.text };

    return {
      ...viewModel,
      errorMessage,
      fieldset: {
        legend: viewModel.label,
      },
      items: componentViewModels,
    };
  }
}
