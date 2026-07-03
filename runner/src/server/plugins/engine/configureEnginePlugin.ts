import { FormDefinition } from "@xgovformbuilder/model";
import path from "path";
import config from "../../config";
import { idFromFilename } from "./helpers";
import { plugin } from "./plugin";
import {
  FormConfiguration,
  loadPreConfiguredForms,
} from "./services/configurationService";

type ConfigureEnginePlugin = (
  formFileName?: string,
  formFilePath?: string,
  options?: { previewMode?: string }
) => {
  plugin: any;
  options: {
    modelOptions: {
      relativeTo: string;
      previewMode: any;
    };
    configs: {
      configuration: FormDefinition;
      id: string;
    }[];
    previewMode: boolean;
  };
};

const relativeTo = __dirname;

export const configureEnginePlugin: ConfigureEnginePlugin = (
  formFileName,
  formFilePath,
  options
) => {
  let configs: FormConfiguration[];

  if (formFileName && formFilePath) {
    configs = [
      {
        id: idFromFilename(formFileName),
        configuration: require(path.join(formFilePath, formFileName)),
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
