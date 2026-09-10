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

const FORMS_FOLDER = path.join(__dirname, "../../../../../../src/server/forms");

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

  suite("duplicate form ids", () => {
    let staleFile: string;
    let currentFile: string;

    afterEach(() => {
      if (staleFile && fs.existsSync(staleFile)) fs.unlinkSync(staleFile);
      if (currentFile && fs.existsSync(currentFile)) fs.unlinkSync(currentFile);
    });

    test("prefers a .jsonc file over a stale .json file with the same id", () => {
      staleFile = path.join(FORMS_FOLDER, "zzz-dedup-test.json");
      currentFile = path.join(FORMS_FOLDER, "zzz-dedup-test.jsonc");
      fs.writeFileSync(staleFile, JSON.stringify({ name: "stale" }));
      fs.writeFileSync(currentFile, JSON.stringify({ name: "current" }));

      const result = loadPreConfiguredForms();
      const matches = result.filter((form) => form.id === "zzz-dedup-test");

      expect(matches.length).to.equal(1);
      expect(matches[0].configuration).to.equal({ name: "current" } as any);
    });
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
