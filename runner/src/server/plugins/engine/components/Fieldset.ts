import { Schema } from "joi";
import { FieldsetComponent } from "@xgovformbuilder/model";
import Joi from "joi";

import { FormComponent } from "./FormComponent";
import { ComponentCollection } from "./ComponentCollection";
import {
  FormData,
  FormPayload,
  FormSubmissionErrors,
  FormSubmissionState,
} from "../types";
import { FormModel } from "../models";
import { ListItem } from "./types";

export class Fieldset extends FormComponent {
  children: ComponentCollection;
  formSchema: Joi.Schema;
  stateSchema: Joi.Schema;

  constructor(def: FieldsetComponent, model: FormModel) {
    super(def, model);

    const { components, options } = def;
    const validation = options?.validation;
    const childDefs = validation
      ? [
          ...components,
          // Hidden carrier field for validation to attach
          // to as Joi only runs validators on keys present in the
          // payload. Removing this field disables validation
          {
            type: "TextField" as const,
            name: this.name,
            title: this.title,
            schema: {},
            options: {
              classes: "govuk-!-display-none",
              hideTitle: true,
              disableChangingFromSummary: true,
              allowPrePopulationOverwrite: true,
              required: false,
            },
          },
        ]
      : components;

    this.children = new ComponentCollection(childDefs as any, model);

    // Form schema for payload
    let schema = Joi.any();

    if (validation) {
      for (const val of validation) {
        // Cross-field rule enforcing "at least minRrequired" is filled in
        // Injected as callback on the synthetic [this.name] key in getFormSchemaKeys
        if (val.minRequired && val.minRequired > 0) {
          schema = schema
            .custom((value, helpers) => {
              const root = helpers.state.ancestors[0] as any;
              const filledCount = val.fields.filter((n) => {
                const v = root?.[n];
                return v !== undefined && v !== null && String(v).trim() !== "";
              }).length;

              if (filledCount < val.minRequired) {
                return helpers.error("any.invalid");
              }

              return value ?? "";
            })
            .messages({
              "any.invalid":
                val.errorMessage ??
                `Enter at least ${val.minRequired} of: ${val.fields.join(
                  ", "
                )}`,
            });
        }
      }
    } else {
      schema = Joi.any().optional();
    }

    this.formSchema = schema;

    // State schema - allow empty for fieldset name
    this.stateSchema = Joi.any().allow("", null).optional();
  }

  getFormSchemaKeys() {
    const childrenKeys = this.children.getFormSchemaKeys();

    return {
      ...childrenKeys,
      [this.name]: this.formSchema,
    };
  }

  getStateSchemaKeys() {
    return { [this.name]: this.stateSchema as Schema };
  }

  getFormDataFromState(state: FormSubmissionState) {
    return this.children.getFormDataFromState(state);
  }

  getStateValueFromValidForm(payload: FormPayload) {
    return this.children.getStateFromValidForm(payload);
  }

  getDisplayStringFromState(state: FormSubmissionState) {
    return this.children.items
      .map((item: any) => item.getDisplayStringFromState?.(state))
      .filter(Boolean)
      .join(", ");
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors);
    const childErrors: FormSubmissionErrors | undefined = errors
      ? {
          ...errors,
          errorList:
            errors.errorList?.filter((e) => e.name !== this.name) ?? [],
        }
      : errors;

    const componentViewModels = this.children
      .getViewModel(formData, childErrors)
      .map((vm) => vm.model);

    componentViewModels.forEach((viewModel: any) => {
      if (viewModel.errorMessage) {
        viewModel.classes = `${
          viewModel.classes ?? ""
        } govuk-input--error`.trim();
      }
    });

    return {
      ...viewModel,
      fieldset: { legend: viewModel.label },
      items: componentViewModels as unknown as ListItem[],
    };
  }
}
