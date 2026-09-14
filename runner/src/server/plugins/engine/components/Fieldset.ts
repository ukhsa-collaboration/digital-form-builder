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

  private validationSchema?: Joi.Schema;
  private validatedFieldNames: string[] = [];

  constructor(def: FieldsetComponent, model: FormModel) {
    super(def, model);

    const { components, options } = def;
    const validation = options?.validation;

    const childDefs = validation
      ? [
          ...components,
          // Hidden carrier field for the cross-field rule. Joi only
          // validates keys present in the payload, so this must always
          // be rendered when a group rule is configured.
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

    if (validation) {
      this.validatedFieldNames =
        validation.fields ?? components.map((c) => c.name);
      const minRequired = validation.minRequired ?? 1;

      this.validationSchema = Joi.any()
        .custom((value, helpers) => {
          const root = helpers.state.ancestors[0] as any;
          const filledCount = this.validatedFieldNames.filter((n) => {
            const v = root?.[n];
            return v !== undefined && v !== null && String(v).trim() !== "";
          }).length;
          if (filledCount < minRequired) {
            return helpers.error("any.invalid");
          }
          return value;
        })
        .messages({
          "any.invalid":
            validation.customValidationMessage ??
            `Enter at least ${minRequired} of: ${this.validatedFieldNames.join(
              ", "
            )}`,
        });
    }
  }

  getFormSchemaKeys() {
    const childrenKeys = this.children.getFormSchemaKeys();

    if (!this.validationSchema) return childrenKeys;

    return {
      ...childrenKeys,
      [this.name]: this.validationSchema,
    };
  }

  getStateSchemaKeys() {
    return this.children.getStateSchemaKeys() as Record<string, Schema>;
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
      items: (componentViewModels as unknown) as ListItem[],
    };
  }
}
