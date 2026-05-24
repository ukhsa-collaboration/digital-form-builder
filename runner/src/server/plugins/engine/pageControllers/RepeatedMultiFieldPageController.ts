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
      this.sectionKey,
      this.inputComponents
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
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { query } = request;
      const { removeAtIndex, remove, view, returnUrl } = query;

      if (removeAtIndex !== undefined || remove !== undefined) {
        return this.removeAtIndex(request, h);
      }

      // Not sure if I am using return URL anymore why is this here ? TODO: check if this is needed
      if (view === "summary" || returnUrl) {
        return this.summary.getRouteHandler(request, h);
      }

      // Editing an existing entry: ?view=N where N is a row index.
      // Not sure I feel like the logic of pre filling this based on components should go here
      const isIndexView =
        view !== undefined && view !== "" && !isNaN(Number(view));

      if (isIndexView) {
        const response = await super.makeGetRouteHandler()(request, h);
        const { cacheService } = request.services([]);
        const state = await cacheService.getState(request);
        const entry = this.getPartialState(state, view) ?? {};

        response.source.context.components &&= response.source.context.components.map(
          (component) => {
            console.log(
              "pre-filling component",
              component.name,
              "with value from entry:",
              entry
            );
            const { model } = component;
            model.value = entry[model.name];
            return { ...component, model };
          }
        );

        return response;
      }

      return super.makeGetRouteHandler()(request, h);
    };
  }

  // Check this funciton
  async removeAtIndex(request, h) {
    console.log("MICOL MICOL MICOL RUNNING NEW REMOVE INDEX:", request.query);
    console.log("removeAtIndex called with query:", request.query);
    const { query } = request;
    const { cacheService } = request.services([]);
    const state = await cacheService.getState(request);

    const index = Number(query.removeAtIndex ?? query.remove);
    console.log("Parsed index to remove:", index);

    const current = this.getPartialState(state);
    const list = Array.isArray(current) ? [...current] : [];
    console.log("Current list before removal:", list);

    if (!Number.isNaN(index)) {
      console.log("Removing at index:", index);
      list.splice(index, 1);
    }

    await cacheService.mergeState(request, { [this.sectionKey]: list });
    console.log("Updated list after removal:", list);

    if (list.length < 1) {
      return h.redirect(`/${this.model.basePath}${this.path}?view=0`);
    }
    return h.redirect(`/${this.model.basePath}${this.path}?view=summary`);
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { query } = request;
      const { cacheService } = request.services([]);

      // Summary-page POSTs are owned by the summary controller.
      if (query.view === "summary") {
        return this.summary.postRouteHandler(request, h);
      }

      // 1. VALIDATE FIRST — capture the validated field values, but write nothing
      //    here (modifyUpdate returns {} so the merge step is a no-op).
      let validated: Record<string, unknown> = {};
      const response = await this.handlePostRequest(request, h, {
        arrayMerge: false,
        modifyUpdate: (update: Record<string, unknown>) => {
          validated = update;
          return {};
        },
      });

      // 2. Invalid → re-render the form with its errors. State is untouched.
      if (response?.source?.context?.errors) {
        return response;
      }

      // 3. Valid → bundle the validated values into one entry and write it.
      const entry = this.inputComponents.reduce<Record<string, unknown>>(
        (acc, comp) => {
          if (comp.name in validated) {
            acc[comp.name] = validated[comp.name];
          }
          return acc;
        },
        {}
      );

      const state = await cacheService.getState(request);
      const current = this.getPartialState(state);
      const list = Array.isArray(current) ? [...current] : [];

      const rawIndex = query.view;
      const editIndex =
        rawIndex !== undefined && rawIndex !== "" && !isNaN(Number(rawIndex))
          ? Number(rawIndex)
          : undefined;

      if (editIndex !== undefined && editIndex < list.length) {
        list[editIndex] = {
          ...(list[editIndex] as Record<string, unknown>),
          ...entry,
        };
      } else {
        list.push(entry);
      }

      await cacheService.mergeState(request, { [this.sectionKey]: list });

      return h.redirect(`/${this.model.basePath}${this.path}?view=summary`);
    };
  }
  getPartialState(state, atIndex?: number | string) {
    const partial: Array<Record<string, unknown>> =
      reach(state, this.sectionKey) ?? [];

    if (atIndex !== undefined && atIndex !== null && atIndex !== "") {
      return partial[Number(atIndex)];
    }
    return partial;
  }

  nextIndex(state) {
    const partial = this.getPartialState(state) ?? [];
    return partial.length;
  }
}
