import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import fs from "fs";
import path from "path";
import os from "os";
import {
  loadFormFile,
  loadPreConfiguredForms,
} from "../../../../../../src/server/plugins/engine/services/configurationService";
const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, test, afterEach } = lab;

suite("Engine Plugin ConfigurationService", () => {
  test("it loads pre-configured forms configuration correctly ", () => {
    const testFormJSON = require("../../../../../../src/server/forms/test.json");
    const reportFormJSON = require("../../../../../../src/server/forms/report-a-terrorist.json");
    const result = loadPreConfiguredForms();

    expect(result).to.contain([
      {
        configuration: testFormJSON,
        id: "test",
      },
      {
        id: "report-a-terrorist",
        configuration: reportFormJSON,
      },
    ]);
  });

  suite("loadFormFile", () => {
    let tmpFile: string;

    afterEach(() => {
      if (tmpFile) fs.unlinkSync(tmpFile);
    });

    test("loads a plain .json file", () => {
      tmpFile = path.join(os.tmpdir(), "test-form.json");
      fs.writeFileSync(tmpFile, JSON.stringify({ name: "test" }));
      expect(loadFormFile(tmpFile)).to.equal({ name: "test" } as any);
    });

    test("loads a .jsonc file with single-line comments", () => {
      tmpFile = path.join(os.tmpdir(), "test-form.jsonc");
      fs.writeFileSync(tmpFile, '{ "name": "test" // a comment\n}');
      expect(loadFormFile(tmpFile)).to.equal({ name: "test" } as any);
    });

    test("loads a .jsonc file with block comments", () => {
      tmpFile = path.join(os.tmpdir(), "test-form.jsonc");
      fs.writeFileSync(tmpFile, '{ /* block comment */ "name": "test" }');
      expect(loadFormFile(tmpFile)).to.equal({ name: "test" } as any);
    });
  });
});
