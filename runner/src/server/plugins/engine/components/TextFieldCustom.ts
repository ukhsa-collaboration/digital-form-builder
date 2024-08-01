import { TextFieldCustomComponent } from "@xgovformbuilder/model";
import { FormModel } from "../models";
import joi from "joi";
import * as helpers from "./helpers";
import { FormPayload } from "../types";
import { FormComponent } from "./FormComponent";

// Currently only used on the ReportAnOutbreak/uon-and-cqc page to handle textfield and checkbox comparisons
export class TextFieldCustom extends FormComponent {
  formSchema;
  stateSchema;
  pattern;
  dependentField;
  fieldName;

  constructor(def: TextFieldCustomComponent, model: FormModel) {
    super(def, model);

    const { options, schema = {} } = def;
    this.options = options;
    this.schema = schema;

    if (schema.regex) {
      this.pattern = new RegExp(schema.regex);
    }

    if (options.conditionalTextField) {
      this.dependentField = options.conditionalTextField.dependsOn;
    }

    if (options.fieldName) {
      this.fieldName = options.fieldName;
    }

    let componentSchema = joi.optional().allow(null).allow("");

    this.formSchema = componentSchema;
  }

  getStateSchemaKeys() {
    let schema: any = this.formSchema;

    if (this.fieldName) {
      schema = schema.custom(
        helpers.customTextCheckboxValidator(this.fieldName)
      );
    }

    this.schema = schema;
    return { [this.name]: schema };
  }

  getStateValueFromValidForm(payload: FormPayload) {
    const currentFieldValue = payload[this.name].trim();
    const dependentFieldValue = payload[this.dependentField];

    if (currentFieldValue === "" && !dependentFieldValue) {
      return false;
    }
    if (currentFieldValue && !this.pattern.test(currentFieldValue)) {
      return "regex";
    }
    return currentFieldValue;
  }
}
