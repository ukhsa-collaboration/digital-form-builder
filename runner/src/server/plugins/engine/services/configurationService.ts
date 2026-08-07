import fs from "fs";
import path from "path";
import stripJsonComments from "strip-json-comments";

import { resolveDevPlaceholders } from "../utils/resolveDevPlaceholders";
import { FormDefinition } from "@xgovformbuilder/model";
import { idFromFilename } from "../helpers";

const FORMS_FOLDER = path.join(__dirname, "..", "..", "..", "forms");

export type FormConfiguration = {
  configuration: FormDefinition;
  id: string;
};

export function loadFormFile(filePath: string): FormDefinition {
  const content = fs.readFileSync(filePath, "utf8");
  const stripped = filePath.endsWith(".jsonc")
    ? stripJsonComments(content)
    : content;
  return JSON.parse(stripped);
}

/**
 * Reads the runner/src/server/forms directory for JSON/JSONC files. The forms that are found will be loaded up at localhost:3009/id
 */
export const loadPreConfiguredForms = (): FormConfiguration[] => {
  const configFiles = fs
    .readdirSync(FORMS_FOLDER)
    .filter(
      (filename: string) =>
        filename.endsWith(".json") || filename.endsWith(".jsonc")
    );

  return configFiles.map((configFile) => {
    const dataFilePath = path.join(FORMS_FOLDER, configFile);
    const configuration = resolveDevPlaceholders(loadFormFile(dataFilePath));
    const id = idFromFilename(configFile);
    return { configuration, id };
  });
};
