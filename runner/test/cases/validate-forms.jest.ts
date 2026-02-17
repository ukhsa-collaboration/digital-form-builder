import * as fs from "fs";
import { Schema } from "@xgovformbuilder/model";

const formsPath = "./src/server/forms/";

test("Forms validation", () => {
  let forms = [] as Array<{ fileName: string; fileContent: string }>;

  console.log("Running forms validation tests with path :", formsPath);

  forms = retrieveForms();
  if (!forms.length) {
    throw new Error("No forms found for validation.");
  }

  console.log(`Found ${forms.length} forms to validate.`);

  forms.forEach((form) => {
    const { error } = Schema.validate(JSON.parse(form.fileContent), {
      abortEarly: false,
    });

    if (error) {
      console.log(error.details);
    }

    expect(error).toBe(undefined);
  });
});

function retrieveForms() {
  const fileNames = fs
    .readdirSync(formsPath)
    .filter((file) => file.match(/\.json$/));

  const files = [] as Array<{ fileName: string; fileContent: string }>;
  fileNames.map((fileName) => {
    let typeName = fileName.match(/(^.*?)\.json/);
    if (typeName) {
      const fileContent = fs
        .readFileSync(formsPath + fileName, "utf8")
        .toString();
      if (fileContent) {
        files.push({
          fileName,
          fileContent,
        });
      }
    }
  });

  return files;
}
