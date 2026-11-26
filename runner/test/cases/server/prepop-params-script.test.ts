import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import fs from "fs";
import path from "path";
import vm from "vm";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { suite, test } = lab;

const script = fs.readFileSync(
  path.join(__dirname, "../../../public/static/prepop-params.js"),
  "utf8"
);

type Options = {
  attrs?: Record<string, string>;
  storage?: Record<string, string>;
  pathname?: string;
};

const baseAttrs = {
  "data-form-id": "f",
  "data-start-path": "/f/start",
  "data-clear": "false",
  "data-params": "{}",
};

// Runs the browser script against a stubbed window, document and sessionStorage
function run({ attrs, storage = {}, pathname = "/f/start" }: Options) {
  const replaced: string[] = [];
  const store: Record<string, string> = { ...storage };
  const win: {
    PrePopParams?: { queryString: () => string };
    sessionStorage: object;
    location: object;
  } = {
    sessionStorage: {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    },
    location: { pathname, replace: (url: string) => replaced.push(url) },
  };
  const el = attrs && { getAttribute: (name: string) => attrs[name] ?? null };

  vm.runInNewContext(script, {
    window: win,
    document: { getElementById: () => el },
    JSON,
    Object,
    encodeURIComponent,
  });

  return { win, store, replaced };
}

suite("prepop-params.js", () => {
  test("stores only r and d supplied by the server", () => {
    const { store, win } = run({
      attrs: {
        ...baseAttrs,
        "data-params": '{"r":"abc000","d":"01F2","x":"ignored"}',
      },
    });

    expect(JSON.parse(store["prepopParams:f"])).to.equal({
      r: "abc000",
      d: "01F2",
    });
    expect(win.PrePopParams?.queryString()).to.equal("r=abc000&d=01F2");
  });

  test("restores once on the start page when the session has lost the values", () => {
    const { replaced, store } = run({
      storage: { "prepopParams:f": '{"r":"abc000","d":"01F2"}' },
      attrs: baseAttrs,
    });

    expect(replaced).to.equal(["/f?r=abc000&d=01F2"]);
    expect(store["prepopRestoreAttempted:f"]).to.equal("true");
  });

  test("does not restore on a non-start page", () => {
    const { replaced } = run({
      storage: { "prepopParams:f": '{"r":"abc000"}' },
      attrs: baseAttrs,
      pathname: "/f/page-2",
    });

    expect(replaced).to.equal([]);
  });

  test("does not restore when the form has no start path", () => {
    const { replaced } = run({
      storage: { "prepopParams:f": '{"r":"abc000"}' },
      attrs: { ...baseAttrs, "data-start-path": "" },
    });

    expect(replaced).to.equal([]);
  });

  test("gives up and clears after a rejected restore, without looping", () => {
    const { replaced, store } = run({
      storage: {
        "prepopParams:f": '{"r":"abc000"}',
        "prepopRestoreAttempted:f": "true",
      },
      attrs: baseAttrs,
    });

    expect(replaced).to.equal([]);
    expect(store).to.equal({});
  });

  test("clears stored values on pages flagged data-clear", () => {
    const { store } = run({
      storage: { "prepopParams:f": '{"r":"abc000"}' },
      attrs: { ...baseAttrs, "data-clear": "true" },
    });

    expect(store).to.equal({});
  });

  test("does nothing and exposes an empty query string on non-form pages", () => {
    const { store, win } = run({ attrs: undefined });

    expect(store).to.equal({});
    expect(win.PrePopParams?.queryString()).to.equal("");
  });
});
