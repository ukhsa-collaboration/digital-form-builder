import { HapiRequest, HapiResponseToolkit } from "server/types";
import { PageController } from "./PageController";
import { FormModel } from "server/plugins/engine/models";
import { RepeatedMultiFieldSummaryPageController } from "./RepeatedMultiFieldSummaryPageController";
import { ComponentDef, RepeatingMultiFieldPage } from "@xgovformbuilder/model";
import { FormComponent } from "../components";
import { FormSubmissionState } from "server/plugins/engine/types";
import nunjucks from "nunjucks";

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

export class RepeatedMultiFieldPageController extends PageController {
  summary: RepeatedMultiFieldSummaryPageController;
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

    // CHeck this assignmetn of variables? should I re set summary display mode ?
    // TODO: check if default values should be
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

      // TODO: Check this
      if (removeAtIndex !== undefined || remove !== undefined) {
        return this.removeAtIndex(request, h);
      }

      // Summary view Scenario: ?view=summary or ?returnUrl=/somewhere
      if (view === "summary" || returnUrl) {
        return this.summary.getRouteHandler(request, h);
      }

      // Editing an existing entry: ?view=N where N is a row index.
      const isPastView =
        view !== undefined && view !== "" && !isNaN(Number(view));

      if (isPastView) {
        const response = await super.makeGetRouteHandler()(request, h);
        const { cacheService } = request.services([]);
        const state = await cacheService.getState(request);
        const entry = this.getPartialState(state, view) ?? {};

        // Get Existing values
        const formData = this.components.getFormDataFromState(entry);
        const freshModels = this.components.getViewModel(formData);

        // Swap only the model onto the components the base handler already
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

  // Check this funciton
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

      // Summary-page POSTs are owned by the summary controller.
      if (query.view === "summary") {
        return this.summary.postRouteHandler(request, h);
      }

      let validated: Record<string, unknown> = {};
      const response = await this.handlePostRequest(request, h, {
        arrayMerge: false,
        // Work arround that allows us to capture errors building on top of Page controller
        modifyUpdate: (update: Record<string, unknown>) => {
          validated = update;
          return {};
        },
      });

      if (response?.source?.context?.errors) {
        return response;
      }

      // Valid Path add new entery to array
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

      // Checking if edit or new entery
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
