import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { suite, test } = lab;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const buildRedactionTransport = require("../redactionTransport");

const runThroughTransport = (input: Record<string, unknown>): Promise<any> =>
  new Promise((resolve, reject) => {
    const transform = buildRedactionTransport();
    let output = "";

    transform.on("data", (chunk: string) => {
      output += chunk;
    });
    transform.on("error", reject);
    transform.on("end", () => {
      try {
        resolve(JSON.parse(output.trim()));
      } catch (err) {
        reject(err);
      }
    });

    transform.end(JSON.stringify(input) + "\n");
  });

suite("redactionTransport", () => {
  test("redacts an email field while leaving non-sensitive fields intact", async () => {
    const result = await runThroughTransport({
      email: "jane.doe@nhs.net",
      formId: "rps-risk-report",
    });

    expect(result.email).to.match(/^\[EMAIL_\d+\]$/);
    expect(result.formId).to.equal("rps-risk-report");
  });

  test("redacts PII nested under a dynamically-named field", async () => {
    const result = await runThroughTransport({
      page: {
        answers: {
          customField123: { note: "please call 07700900123" },
        },
      },
    });

    expect(result.page.answers.customField123.note).to.match(
      /please call \[PHONE[^\]]*\]/
    );
  });

  test("expands a JSON-string field (e.g. a fetch RequestInit body) into an object so only its PII fields are redacted", async () => {
    const result = await runThroughTransport({
      init: {
        method: "POST",
        body: JSON.stringify({
          email: "jane.doe@nhs.net",
          formId: "abc123",
        }),
      },
    });

    expect(result.init.body.email).to.match(/^\[EMAIL_\d+\]$/);
    expect(result.init.body.formId).to.equal("abc123");
  });

  test("passes through a log line with no PII unchanged", async () => {
    const result = await runThroughTransport({
      msg: "server started",
      pageIndex: 3,
      isComplete: true,
    });

    expect(result.msg).to.equal("server started");
    expect(result.pageIndex).to.equal(3);
    expect(result.isComplete).to.equal(true);
  });
});
