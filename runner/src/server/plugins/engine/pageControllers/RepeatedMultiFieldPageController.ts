import { HapiRequest, HapiResponseToolkit } from "server/types";
import { PageController } from "./PageController";
import { FormModel } from "server/plugins/engine/models";
import { ComponentDef, RepeatingMultiFieldPage } from "@xgovformbuilder/model";
import { FormComponent } from "../components";
import { FormSubmissionState } from "server/plugins/engine/types";
import nunjucks from "nunjucks";

import joi from "joi";
import { reach, clone } from "hoek";

import type { SummaryDetailsTransformationMap } from "server/transforms/summaryDetails/types";
const summaryDetailsTransformations: SummaryDetailsTransformationMap = require("../../../transforms/summaryDetails");

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

export class RepeatedMultiFieldPageController extends PageController {
  inputComponents!: FormComponent[];
  isRepeatingFieldPageController = true;
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

    const providedOptions = pageDef?.options ?? {};
    this.options = {
      ...DEFAULT_OPTIONS,
      ...providedOptions,
      summaryDisplayMode: {
        ...DEFAULT_OPTIONS.summaryDisplayMode,
        ...providedOptions.summaryDisplayMode,
      },
      customText: {
        ...DEFAULT_OPTIONS.customText,
        ...providedOptions.customText,
      },
    };

    this.isSeparateDisplayMode = this.options.summaryDisplayMode.separatePage!;
    this.hideRowTitles = this.options.summaryDisplayMode.hideRowTitles!;

    const allInputs = (this.components?.items ?? []).filter(isInputType);
    if (allInputs.length === 0) {
      throw Error(
        "RepeatingSectionPageController: no input components found on page"
      );
    }
    this.inputComponents = allInputs as FormComponent[];
  }

  get stateSchema() {
    const componentNames = this.inputComponents.map((c) => c.name);

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

    return super.stateSchema
      .fork(componentNames, (schema) => schema.optional())
      .keys({
        [this.sectionKey]: joi
          .array()
          .items(itemSchema)
          .single()
          .empty(null)
          .default([]),
      });
  }

  makeGetRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { query } = request;
      const { removeAtIndex, remove, view, returnUrl } = query;

      if (removeAtIndex !== undefined || remove !== undefined) {
        return this.removeAtIndex(request, h);
      }

      // Summary view scenario: ?view=summary or ?returnUrl=/somewhere
      if (view === "summary" || returnUrl) {
        const { cacheService } = request.services([]);
        const state = await cacheService.getState(request);

        const { progress = [] } = state;
        progress.push(`/${this.model.basePath}${this.path}?view=summary`);
        await cacheService.mergeState(request, { progress });

        return h.view(
          "repeating-multi-field-summary",
          this.getSummaryViewModel(state)
        );
      }

      // Editing an existing entry: ?view=N where N is a row index.
      const isPastView =
        view !== undefined && view !== "" && !isNaN(Number(view));

      if (isPastView) {
        const response = await super.makeGetRouteHandler()(request, h);
        const { cacheService } = request.services([]);
        const state = await cacheService.getState(request);
        const entry = this.getPartialState(state, view) ?? {};

        // Get existing values
        const formData = this.components.getFormDataFromState(entry);
        const freshModels = this.components.getViewModel(formData);

        // Swap only the model onto the components the base handler already built
        response.source.context.components &&= response.source.context.components.map(
          (component) => {
            const name = component.model?.name;
            if (!name) return component;

            const fresh = freshModels.find((c) => c.model?.name === name);
            return fresh ? { ...component, model: fresh.model } : component;
          }
        );

        return response;
      }

      // New entry scenario
      return super.makeGetRouteHandler()(request, h);
    };
  }

  async removeAtIndex(request, h) {
    const { query } = request;
    const { cacheService } = request.services([]);
    const state = await cacheService.getState(request);

    const index = Number(query.removeAtIndex ?? query.remove);

    const current = this.getPartialState(state);
    const list = Array.isArray(current) ? [...current] : [];

    if (!Number.isNaN(index)) {
      list.splice(index, 1);
    }

    await cacheService.mergeState(request, { [this.sectionKey]: list });

    if (list.length < 1) {
      return h.redirect(`/${this.model.basePath}${this.path}?view=0`);
    }
    return h.redirect(`/${this.model.basePath}${this.path}?view=summary`);
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { query } = request;
      const { cacheService } = request.services([]);

      // Summary-page POSTs: either add another entry or continue to the next page.
      if (query.view === "summary") {
        const state = await cacheService.getState(request);

        if (request.payload?.next === "increment") {
          const nextIndex = this.nextIndex(state); // next free slot
          return h.redirect(
            `/${this.model.basePath}${this.path}?view=${nextIndex}`
          );
        }

        return h.redirect(this.getNext(request.payload));
      }

      let validated: Record<string, unknown> = {};
      const response = await this.handlePostRequest(request, h, {
        arrayMerge: false,
        // Work around that allows us to capture errors building on top of Page controller
        modifyUpdate: (update: Record<string, unknown>) => {
          validated = update;
          return {};
        },
      });

      if (response?.source?.context?.errors) {
        return response;
      }

      // Valid path: add new entry to array
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

      // Checking if edit or new entry
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

  private getSummaryViewModel(state: any) {
    const baseViewModel = super.getViewModel(state);
    let details = this.toSummaryDetails(state);

    // Replicates the behaviour of the standard summary view model.
    const transformDetails = summaryDetailsTransformations[this.model.basePath];
    if (transformDetails) {
      try {
        details = transformDetails(clone(details));
      } catch (err) {
        console.error(
          "Error applying summary details transformation:",
          err,
          "Original details:",
          details
        );
      }
    }

    return {
      ...baseViewModel,
      customText: this.options.customText,
      details,
      returnUrl: this.returnUrl,
    };
  }

  private cardTitle(index: number): string {
    const tmpl = (this.options?.customText as any)?.cardTitle ?? "Item {index}";
    return tmpl.replace("{index}", String(index + 1));
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
    const partial = this.getPartialState(state);
    return partial.length;
  }

  private formatValue(comp: any, value: unknown): string {
    if (value === undefined || value === null || value === "") return "";

    // Selection fields store a value but display text — map it.
    const listText = comp.list?.items?.find((i: any) => i.value === value)
      ?.text;
    if (listText !== undefined) return listText;

    if (comp.dataType === "date" || comp.dataType === "monthYear") {
      const d = new Date(value as string);
      if (!isNaN(d.getTime())) {
        return comp.dataType === "monthYear"
          ? d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
          : d.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
      }
    }

    // Composite components (e.g. ContactDetailsCollection) store an object.
    if (typeof value === "object") {
      return Object.values(value as Record<string, unknown>)
        .filter((v) => v !== undefined && v !== null && v !== "")
        .join(", ");
    }

    return String(value);
  }

  toSummaryDetails(
    state: FormSubmissionState
  ): Array<{
    name: string;
    title: string;
    index: number;
    card: string;
    items: Array<{
      name: string;
      label: string;
      value: string;
      url: string;
    }>;
  }> {
    const entries =
      (this.getPartialState(state) as Array<Record<string, unknown>>) ?? [];

    return entries.map((entry, index) => ({
      name: String(index), // delete link → ?remove={{ data.name }}
      title: this.cardTitle(index), // e.g. "Item 1"
      index,
      card: `?view=${index}`, // change link → href="{{ data.card }}"
      items: this.inputComponents.map((comp) => ({
        name: comp.name,
        label: (comp.title ?? comp.name) as string,
        value: this.formatValue(comp, entry[comp.name]),
        url: `/${this.model.basePath}${this.path}?view=${index}`,
      })),
    }));
  }

  toWebhookQuestions(state: FormSubmissionState) {
    const entries =
      ((state as any)[this.sectionKey] as Array<Record<string, unknown>>) ?? [];

    const pageTitle = nunjucks.renderString(this.title.en ?? this.title, {
      ...state,
    });

    return [
      {
        category: this.section?.name,
        question: pageTitle,
        fields: [
          {
            key: this.sectionKey,
            title: pageTitle,
            type: "list",
            answer: entries,
          },
        ],
        index: 0,
      },
    ];
  }
}
