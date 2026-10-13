import joi from "joi";
import { ConditionalRadiosFieldComponent } from "@xgovformbuilder/model";

import { ListFormComponent } from "./ListFormComponent";
import { FormData, FormPayload, FormSubmissionErrors } from "../types";
import { FormModel } from "../models";

const customValue = "__custom";

export class ConditionalRadiosField extends ListFormComponent {
  constructor(def: ConditionalRadiosFieldComponent, model: FormModel) {
    const list: any = model.getList(def.list);

    const normalizedList = {
      ...list,
      items: list.items.map((item: any) => ({
        ...item,
        ...(item.type === "TextField" && { value: customValue }),
        ...(item.divider !== undefined && { value: "__divider" }),
      })),
    };

    super(def, {
      ...model,
      getList: () => normalizedList,
    } as unknown as FormModel);

    const radioItems = this.items.filter(
      (item: any) => item.type !== "TextField" && item.divider === undefined
    );

    const allowedValues = radioItems
      .map((item) => item.value)
      .filter((value) => value !== undefined);

    this.formSchema = joi
      .any()
      .custom((value, helpers) => {
        const values = Array.isArray(value) ? value : [value];
        const customText = values.find(
          (item) =>
            typeof item === "string" && item !== customValue && item.trim()
        );
        const hasCustomValue = values.includes(customValue);
        const hasRadioValue = values.some((item) =>
          allowedValues.includes(item)
        );

        const hasUnmarkedCustomText = values.some(
          (item) =>
            typeof item === "string" &&
            item !== customValue &&
            item.trim() &&
            !allowedValues.includes(item)
        );

        if (hasUnmarkedCustomText) {
          return value;
        }

        if (hasCustomValue) {
          return customText ? value : helpers.error("any.required");
        }

        if (hasRadioValue) {
          return value;
        }

        return helpers.error("any.required");
      })
      .required()
      .messages(def.options.customValidationMessages || {});

    this.stateSchema = this.formSchema;
    this.customValue = customValue;
  }

  private customValue: string;

  private isFixedValue(value: any) {
    return this.items.some(
      (item: any) =>
        item.type !== "TextField" &&
        item.divider === undefined &&
        (item.value === value || item.label === value || item.text === value)
    );
  }

  getStateFromValidForm(payload: FormPayload) {
    const submittedValue = payload[this.name];

    const values = Array.isArray(submittedValue)
      ? submittedValue
      : [submittedValue];

    const selectedValue = values.find((value) => this.isFixedValue(value));
    const selectedItem = this.items.find(
      (item: any) =>
        item.value === selectedValue ||
        item.label === selectedValue ||
        item.text === selectedValue
    );
    const selectedLabel = selectedItem?.label ?? selectedItem?.text;
    const customText = values.find(
      (value) =>
        value !== this.customValue &&
        !this.values.includes(value) &&
        !this.isFixedValue(value)
    );

    if (values.includes(this.customValue)) {
      return { [this.name]: customText || null };
    }

    return {
      [this.name]: selectedLabel || selectedValue || customText || null,
    };
  }

  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors);
    const submittedValue = formData[this.name];

    const values = Array.isArray(submittedValue)
      ? submittedValue
      : [submittedValue];

    const customText = values.find(
      (value) =>
        value !== this.customValue &&
        !this.values.includes(value) &&
        !this.isFixedValue(value)
    );

    viewModel.name = this.name;
    viewModel.id = this.name;
    viewModel.items = this.items.map((item: any, index) => {
      if (item.divider !== undefined) {
        return { divider: item.divider, value: "" };
      }

      const isCustom = item.type === "TextField";
      const value = isCustom ? this.customValue : item.value;
      const label = item.label ?? item.text ?? "";
      const isSelected = values.includes(item.value) || values.includes(label);

      return {
        text: label,
        value,
        checked: isCustom ? Boolean(customText) : isSelected,
        ...(isCustom && {
          conditional: {
            html: `<input class="govuk-input govuk-!-width-one-third" id="${
              this.name
            }-custom" name="${this.name}" type="text" value="${
              customText ?? ""
            }">`,
          },
        }),
        ...(index === 0 && { id: this.name }),
      };
    });

    return viewModel;
  }

  getDisplayStringFromState(state) {
    return state[this.name];
  }
}
