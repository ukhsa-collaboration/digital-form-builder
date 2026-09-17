import { hasFeatureFlag } from "../featureFlags";
import { FormDefinition } from "../data-model/types";

describe("hasFeatureFlag", () => {
  it("returns true when flag is present in featureFlags array", () => {
    const def: Partial<FormDefinition> = {
      featureFlags: ["ENHANCED_SUMMARY_VALIDATION", "OTHER_FLAG"],
    };
    expect(
      hasFeatureFlag(def as FormDefinition, "ENHANCED_SUMMARY_VALIDATION")
    ).toBe(true);
  });

  it("returns false when flag is not present in featureFlags array", () => {
    const def: Partial<FormDefinition> = {
      featureFlags: ["OTHER_FLAG"],
    };
    expect(
      hasFeatureFlag(def as FormDefinition, "ENHANCED_SUMMARY_VALIDATION")
    ).toBe(false);
  });

  it("returns false when featureFlags is empty", () => {
    const def: Partial<FormDefinition> = {
      featureFlags: [],
    };
    expect(
      hasFeatureFlag(def as FormDefinition, "ENHANCED_SUMMARY_VALIDATION")
    ).toBe(false);
  });

  it("returns false when featureFlags is undefined", () => {
    const def: Partial<FormDefinition> = {};
    expect(
      hasFeatureFlag(def as FormDefinition, "ENHANCED_SUMMARY_VALIDATION")
    ).toBe(false);
  });

  it("is case-sensitive", () => {
    const def: Partial<FormDefinition> = {
      featureFlags: ["enhanced_summary_validation"],
    };
    expect(
      hasFeatureFlag(def as FormDefinition, "ENHANCED_SUMMARY_VALIDATION")
    ).toBe(false);
  });
});
