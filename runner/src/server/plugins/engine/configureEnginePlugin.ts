import path from "path";
import config from "../../config";
import { idFromFilename } from "./helpers";
import { plugin } from "./plugin";
import {
  FormConfiguration,
  loadPreConfiguredForms,
} from "./services/configurationService";
import { FormDefinition } from "@xgovformbuilder/model";

const relativeTo = __dirname;

export const configureEnginePlugin = (formFileName, formFilePath, options) => {
  let configs: FormConfiguration[];

  if (formFileName && formFilePath) {
    configs = [
      {
        id: idFromFilename(formFileName),
        configuration: require(path.join(
          formFilePath,
          formFileName
        )) as FormDefinition,
      },
    ];
  } else {
    configs = loadPreConfiguredForms();
  }

  const modelOptions = {
    relativeTo,
    previewMode: options?.previewMode ?? config.previewMode,
  };

  return {
    plugin,
    options: { modelOptions, configs, previewMode: config.previewMode },
  };
};
