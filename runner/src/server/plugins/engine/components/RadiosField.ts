import { SelectionControlField } from "./SelectionControlField";
import { FormData, FormSubmissionErrors } from "../types";
/**
 * @description When `options.divider` is set, inserts a filler item and an "or"
 * divider marker second-from-last in the radio items list (e.g. for a
 * "None of the above" / "or" separator pattern).
 * Exported Components must follow the naming convention implemented in @xgovformbuilder/model/components ComponentType.
 * In the Form JSON, components have a type property which is the name of the components, e.g. DateField.
 * Components are loaded in the ComponentsCollection constructor.
 */
export class RadiosField extends SelectionControlField {
  getViewModel(formData: FormData, errors: FormSubmissionErrors) {
    const viewModel = super.getViewModel(formData, errors);

    const items = viewModel.items ?? [];
    if (this.options.divider && items.length > 1) {
      items.splice(items.length - 1, 0, { text: "filler", value: "filler" });
      viewModel.items = items.map((item, index, arr) => ({
        ...item,
        ...(index === arr.length - 2 && { divider: "or" }),
      }));
    }
    return viewModel;
  }
}
