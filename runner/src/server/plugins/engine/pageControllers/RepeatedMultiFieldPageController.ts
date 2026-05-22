import { HapiRequest, HapiResponseToolkit } from "server/types";
import { PageController } from "./PageController";
import { FormModel } from "server/plugins/engine/models";
import { RepeatedMultiFieldSummaryPageController } from "./RepeatedMultiFieldSummaryPageController";
import { ComponentDef, RepeatingMultiFieldPage } from "@xgovformbuilder/model";
import { FormComponent } from "../components";

import joi from "joi";
import { reach } from "hoek";

const contentTypes: Array<ComponentDef["type"]> = [
  "Para",
  "Details",
  "Html",
  "InsetText",
];

function isInputType(component) {
  return !contentTypes.includes(component.type);
}

const DEFAULT_OPTIONS = {
  summaryDisplayMode: {
    samePage: false,
    separatePage: true,
    hideRowTitles: false,
  },
  customText: {},
};

// Should be somethign along these lines
/**
 * RepeatedMultiFieldPageController
 *
 * Repeats a SECTION (a group of input components) on a single page, rather
 * than a single field. Replaces the pattern of duplicating page definitions
 * 1..N with conditional Yes/No routing between them.
 *
 * State shape:
 *   state[sectionKey] = Array<{ [componentName]: value }>
 *
 * Example (8 input components on this page):
 *   state.peopleYouLiveWith = [
 *     { first_name: "Alice", last_name: "...", contact_directly: "...",
 *       contact_details_collection: {...} },
 *     { first_name: "Bob",   last_name: "...", ... }
 *   ]
 *
 * Inherits from RepeatingFieldPageController to reuse:
 *   - options / summaryDisplayMode plumbing
 *   - RepeatingSummaryPageController wiring
 *   - the basic GET/POST shape (we override the data-handling internals)
 *
 * Overrides everything that assumed a single `inputComponent`:
 *   - constructor: collect ALL input components, not just the first
 *   - stateSchema: array-of-objects rather than array-of-primitives
 *   - getPartialState / nextIndex / removeAtIndex: key off sectionKey
 *   - GET handler: populate each component from state[sectionKey][view][name]
 *   - POST handler: bundle all field values into one object; append or
 *     replace-at-index when editing
 */
/**
 * TODO:- this will be refactored as per https://github.com/XGovFormBuilder/digital-form-builder/discussions/855
 */
export class RepeatedMultiFieldPageController extends PageController {
  summary: RepeatedMultiFieldSummaryPageController;
  inputComponents!: FormComponent[];
  isRepeatingFieldPageController = true;
  isSamePageDisplayMode: boolean;
  isSeparateDisplayMode: boolean;
  hideRowTitles: boolean;
  sectionKey: string;

  options: RepeatingMultiFieldPage["options"];

  constructor(model: FormModel, pageDef: RepeatingMultiFieldPage) {
    super(model, pageDef);
    this.sectionKey = pageDef.options?.sectionKey;

    if (!this.sectionKey) {
      throw Error(
        "RepeatedMultiFieldPage initialisation failed, no section key was found"
      );
    }

    this.options = pageDef?.options ?? DEFAULT_OPTIONS;
    this.options.summaryDisplayMode ??= DEFAULT_OPTIONS.summaryDisplayMode;
    this.options.summaryDisplayMode.hideRowTitles ??=
      DEFAULT_OPTIONS.summaryDisplayMode.hideRowTitles;
    this.options.customText ??= DEFAULT_OPTIONS.customText;

    this.isSamePageDisplayMode = this.options.summaryDisplayMode.samePage!;
    this.isSeparateDisplayMode = this.options.summaryDisplayMode.separatePage!;
    this.hideRowTitles = this.options.summaryDisplayMode.hideRowTitles!;

    const allInputs = (this.components?.items ?? []).filter(isInputType);
    if (allInputs.length === 0) {
      throw Error(
        "RepeatingSectionPageController: no input components found on page"
      );
    }
    this.inputComponents = allInputs as FormComponent[];

    this.summary = new RepeatedMultiFieldSummaryPageController(
      model,
      pageDef,
      this.sectionKey
    );
    this.summary.getPartialState = this.getPartialState;
    this.summary.nextIndex = this.nextIndex;
    this.summary.removeAtIndex = this.removeAtIndex;

    this.summary.options = this.options;
  }

  // TODO: drafted this function needs checking and documenting
  get stateSchema() {
    console.log("State schema function");
    console.log(
      `[RepeatingSectionPageController] Building state schema; sectionKey=${this.sectionKey}, ` +
        `inputComponents=[${this.inputComponents
          .map((c) => c.name)
          .join(", ")}]`
    );

    const itemSchema = joi.object(
      this.inputComponents.reduce<Record<string, joi.Schema>>((acc, comp) => {
        const anyComp = (comp as unknown) as {
          getStateSchemaKeys?: () => Record<string, joi.Schema>;
        };
        const fieldSchema = anyComp.getStateSchemaKeys
          ? anyComp.getStateSchemaKeys()[comp.name]
          : joi.any();
        acc[comp.name] = fieldSchema;
        return acc;
      }, {})
    );

    console.log("components reduced to itemSchema:");
    console.log(itemSchema.describe());
    const parentSchema = super.stateSchema.keys({
      [this.sectionKey]: joi
        .array()
        .items(itemSchema)
        .single()
        .empty(null)
        .default([]),
    });

    return parentSchema;
  }

  makeGetRouteHandler() {
    console.log("RepeatedMultiFieldPageController makeGetRouteHandler");
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { query } = request;
      const { removeAtIndex, view, returnUrl } = query;

      if (removeAtIndex ?? false) {
        return this.removeAtIndex(request, h);
      }

      if (view === "summary" || returnUrl) {
        return this.summary.getRouteHandler(request, h);
      }

      if ((view ?? false) || this.isSamePageDisplayMode) {
        const response = await super.makeGetRouteHandler()(request, h);
        const { cacheService } = request.services([]);
        const state = await cacheService.getState(request);
        const partialState = this.getPartialState(state, view);
        response.source.context.components &&= response.source.context.components.map(
          (component) => {
            const { model } = component;
            model.value = partialState;
            model.items &&= model.items.filter(
              (item) => !state[model.name]?.includes(item.value)
            );
            return {
              ...component,
              model,
            };
          }
        );

        this.addRowsToViewContext(response, state);
        return response;
      }
      return super.makeGetRouteHandler()(request, h);
    };
  }

  addRowsToViewContext(response, state) {
    if (this.options!.summaryDisplayMode!.samePage) {
      const rows = this.summary.getRowsFromAnswers(this.getPartialState(state));
      response.source.context.details = { rows };
    }
  }

  async removeAtIndex(request, h) {
    console.log("this is the remove at index function");
    // const { query } = request;
    // const { removeAtIndex, view } = query;
    // const { cacheService } = request.services([]);
    // let state = await cacheService.getState(request);
    // const key = this.inputComponent.name;
    // const answers = state[key];
    // answers?.splice(removeAtIndex, 1);
    // await cacheService.mergeState(request, { [key]: answers });
    // if (state[key]?.length < 1) {
    //   return h.redirect("?view=0");
    // }

    // return h.redirect(`?view=${view ?? 0}`);
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { query } = request;
      const { cacheService } = request.services([]);
      const state = await cacheService.getState(request);

      // Summary-page POST ("add another" / continue buttons rendered by the
      // separate summary view) is owned by the summary controller.
      if (query.view === "summary") {
        return this.summary.postRouteHandler(request, h);
      }

      // "Continue" leaves the repeating section. Separate-page mode routes to the
      // summary first (so the user can review / add more); otherwise normal next.
      if (request?.payload?.next === "continue") {
        const { next, ...rest } = request.payload;
        if (this.isSeparateDisplayMode) {
          return h.redirect(`/${this.model.basePath}${this.path}?view=summary`);
        }
        return h.redirect(this.getNext(rest));
      }

      // Bundle every input component's posted value into ONE entry object, then
      // append it (new) or replace it (editing ?view=N) in state[sectionKey].
      const modifyUpdate = (update: Record<string, unknown>) => {
        const entry = this.inputComponents.reduce<Record<string, unknown>>(
          (acc, comp) => {
            // Only copy keys actually present in the payload, so conditionally
            // hidden / un-posted fields don't get wiped to undefined on edit.
            if (comp.name in update) {
              acc[comp.name] = update[comp.name];
            }
            return acc;
          },
          {}
        );

        const current = this.getPartialState(state) ?? [];
        const list = Array.isArray(current) ? [...current] : [];

        const rawIndex = query.view;
        const editIndex =
          rawIndex !== undefined && rawIndex !== "" && !isNaN(Number(rawIndex))
            ? Number(rawIndex)
            : undefined;

        if (editIndex !== undefined && editIndex < list.length) {
          // Replace at index, merging so untouched keys on that entry survive.
          list[editIndex] = {
            ...(list[editIndex] as Record<string, unknown>),
            ...entry,
          };
        } else {
          // New entry (no view, or view === length) → append.
          list.push(entry);
        }

        return { [this.sectionKey]: list };
      };

      // We build the full array ourselves → the merge must REPLACE the section
      // key, not concat onto it.
      const response = await this.handlePostRequest(request, h, {
        arrayMerge: false,
        modifyUpdate,
      });

      // Validation failed → re-render with errors (plus the list in same-page mode).
      if (response?.source?.context?.errors) {
        this.addRowsToViewContext(response, state);
        return response;
      }

      // Saved. Same-page mode stays and shows the updated list; separate-page
      // mode bounces to the summary to add another or continue.
      if (this.isSamePageDisplayMode) {
        return h.redirect(`/${this.model.basePath}${this.path}`);
      }
      return h.redirect(`/${this.model.basePath}${this.path}?view=summary`);
    };
  }

  getPartialState(state, atIndex?: number) {
    // I guess I will have to change this to sectionKey
    // const keyName = this.inputComponent.name;
    const keyName = this.pageDef.sectionKey ?? "";
    const sectionName = this.pageDef.sectionName ?? "";

    const path = [sectionName, keyName].filter(Boolean).join(".");

    const partial = reach(state, path); // TODO: look up reach function
    if (atIndex ?? false) {
      return partial[atIndex!];
    }

    return partial;
  }

  nextIndex(state) {
    const partial = this.getPartialState(state) ?? [];
    return partial.length;
  }
}
