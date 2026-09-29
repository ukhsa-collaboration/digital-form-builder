import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { suite, test } = lab;

import { isPlainObject } from "../object";

suite("isPlainObject", () => {
  test("returns true for a plain object", () => {
    expect(isPlainObject({ a: 1 })).to.be.true();
  });

  test("returns true for an empty object", () => {
    expect(isPlainObject({})).to.be.true();
  });

  test("returns false for null", () => {
    expect(isPlainObject(null)).to.be.false();
  });

  test("returns false for a string", () => {
    expect(isPlainObject("hello")).to.be.false();
  });

  test("returns false for a number", () => {
    expect(isPlainObject(42)).to.be.false();
  });

  test("returns false for undefined", () => {
    expect(isPlainObject(undefined)).to.be.false();
  });

  test("returns false for a Buffer", () => {
    expect(isPlainObject(Buffer.from("data"))).to.be.false();
  });

  test("returns false for an array", () => {
    expect(isPlainObject([1, 2, 3])).to.be.false();
  });
});
