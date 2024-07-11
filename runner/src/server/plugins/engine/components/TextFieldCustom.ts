import { TextFieldCustomComponent } from "@xgovformbuilder/model";
import { FormModel } from "../models";
import joi from "joi";
import { TextField } from "./TextField";
import * as helpers from "./helpers";
import { FormPayload } from "../types";

// Currently only used on the ReportAnOutbreak/uon-and-cqc page to handle textfield and checkbox comparisons
export class TextFieldCustom extends TextField {
  formSchema;
  stateSchema;
  pattern = "^(1-\\d{1,9}|[a-zA-Z0-9]{3,7})$";

  constructor(def: TextFieldCustomComponent, model: FormModel) {
    super(def, model);

    const { options, schema = {} } = def;
    this.options = options;
    this.schema = schema;

    let componentSchema = joi.optional().allow(null).allow("");

    componentSchema = componentSchema.label(
      def.title.en ?? def.title ?? def.name
    );

    this.formSchema = componentSchema;
  }

  getStateSchemaKeys() {
    let schema: any = this.formSchema;
    schema = schema.custom(helpers.customCqcValidator());

    this.schema = schema;
    return { [this.name]: schema };
  }

  getStateValueFromValidForm(payload: FormPayload) {
    const cqcTextValue = payload["S0Q3"].trim();
    const pattern = new RegExp(this.pattern);
    if (cqcTextValue === "" && !payload["S0Q4"]) {
      return false;
    }
    if (cqcTextValue && !pattern.test(cqcTextValue)) {
      return "regex";
    }
    return cqcTextValue;
  }
}
