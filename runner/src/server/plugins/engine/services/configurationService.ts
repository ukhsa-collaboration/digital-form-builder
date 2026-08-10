import fs from "fs";
import path from "path";
import stripJsonComments from "strip-json-comments";

import { resolvePlaceholders } from "../utils/resolvePlaceholders";
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
 *
 * A `.json` and `.jsonc` file with the same base name resolve to the same id (see
 * `idFromFilename`), which happens when a form is renamed from `.json` to `.jsonc`
 * but a stale compiled `.json` is left behind in `dist`. Loading both would register
 * two conflicting form definitions under the same id, so the `.jsonc` wins and the
 * stale file is skipped.
 */
export const loadPreConfiguredForms = (): FormConfiguration[] => {
  const configFiles = fs
    .readdirSync(FORMS_FOLDER)
    .filter(
      (filename: string) =>
        filename.endsWith(".json") || filename.endsWith(".jsonc")
    );

  const filesById = new Map<string, string>();
  configFiles.forEach((configFile) => {
    const id = idFromFilename(configFile);
    const existing = filesById.get(id);
    if (!existing) {
      filesById.set(id, configFile);
      return;
    }
    const [stale, current] = existing.endsWith(".jsonc")
      ? [configFile, existing]
      : [existing, configFile];
    // eslint-disable-next-line no-console
    console.warn(
      `[loadPreConfiguredForms] Found both '${stale}' and '${current}' for form id '${id}'. ` +
        `Ignoring '${stale}' - this is likely a stale build artifact left behind after a rename. ` +
        `Delete it from the forms output directory.`
    );
    filesById.set(id, current);
  });

  return Array.from(filesById.entries()).map(([id, configFile]) => {
    const dataFilePath = path.join(FORMS_FOLDER, configFile);
    const configuration = resolvePlaceholders(loadFormFile(dataFilePath));
    return { configuration, id };
  });
};
