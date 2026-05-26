import { PageController } from "server/plugins/engine/pageControllers/PageController";
import {
  HapiRequest,
  HapiResponseToolkit,
  HapiLifecycleMethod,
} from "server/types";
import { RepeatingFieldPageController } from "./RepeatingFieldPageController";
// import summaryDetailsTransformationsMap from "server/transforms/summaryDetails";

// TODO: re-insert summay details transformation
// import { SummaryDetailsTransformationMap } from "./summaryDetailsTransformations";
import { clone } from "hoek";

import type { SummaryDetailsTransformationMap } from "server/transforms/summaryDetails/types";
const summaryDetailsTransformations: SummaryDetailsTransformationMap = require("../../../transforms/summaryDetails");
export class RepeatedMultiFieldSummaryPageController extends PageController {
  private getRoute!: HapiLifecycleMethod;
  private postRoute!: HapiLifecycleMethod;
  nextIndex!: RepeatingFieldPageController["nextIndex"];
  getPartialState!: RepeatingFieldPageController["getPartialState"];
  options!: RepeatingFieldPageController["options"];
  removeAtIndex!: RepeatingFieldPageController["removeAtIndex"];

  // Decide if you want to refer to the input components by referning sectionKey or the componets directly
  sectionKey: string;
  inputComponents: any[];

  constructor(model, pageDef, sectionKey, inputComponents) {
    super(model, pageDef);
    this.sectionKey = sectionKey;
    this.inputComponents = inputComponents;
  }

  get getRouteHandler() {
    this.getRoute ??= this.makeGetRouteHandler();
    return this.getRoute;
  }

  get postRouteHandler() {
    this.postRoute ??= this.makePostRouteHandler();
    return this.postRoute;
  }

  makeGetRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]); // Unsure what this line does

      // TODO: check remove function
      const { removeAtIndex } = request.query;
      if (removeAtIndex ?? false) {
        return this.removeAtIndex(request, h); // Unsure about this line as well
      }

      const state = await cacheService.getState(request);
      const { progress = [] } = state; // I forget what this was used for TODO: re-insert

      // Unsure what the purpose of this line is as well
      progress?.push(`/${this.model.basePath}${this.path}?view=summary`);
      await cacheService.mergeState(request, { progress });

      const viewModel = this.getViewModel(state);

      // Check this has already filtered out only the relevant entries
      return h.view("repeating-multi-field-summary", viewModel);
    };
  }

  // This somewhat duplicates the logic in Summary View Model --- consider whether to re-use the Summary View Model instead of having this logic in two places
  // Decision to not do the above was postponed for now as it would require some refactoring of the Summary View Model
  // The other suitable option would be to create a View Model that extends Summary View Model and contains this additional logic for handling multiple entries, and then use this new View Model in both the Summary Page Controller and the Repeated Multi Field Summary Page Controller
  getViewModel(formData: any) {
    const baseViewModel = super.getViewModel(formData);
    const entries = this.getPartialState(formData) ?? [];
    let details = this.buildDetails(entries);

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
      returnUrl: this.returnUrl, // TODO: check return Url logic here
    };
  }

  // TODO: I think this needs reviewing
  private buildDetails(entries: Array<Record<string, unknown>>) {
    return entries.map((entry, index) => ({
      name: String(index), // macro delete link → ?remove={{ data.name }}
      title: this.cardTitle(index), // "Item 1"
      index,
      card: `?view=${index}`, // macro change link → href="{{ data.card }}" /// TODO: unsure Where this si actually used
      items: (this.inputComponents ?? []).map((comp: any) => ({
        name: comp.name,
        label: comp.title ?? comp.name,
        value: this.formatValue(comp, entry[comp.name]),
        url: `/${this.model.basePath}${this.path}?view=${index}`,
      })),
    }));
  }

  private cardTitle(index: number): string {
    // TODO: the name of this should probably have another default as opposed to "Item {index}", and this default should be used in the summary page template as well, so that it's consistent with the case where there is no custom text at all
    const tmpl = (this.options?.customText as any)?.cardTitle ?? "Item {index}";
    return tmpl.replace("{index}", String(index + 1));
  }

  // I don't understand why we need this extra function this should be the same as everyere else
  private formatValue(comp: any, value: unknown): string {
    if (value === undefined || value === null || value === "") return "";

    // Selection fields store a value but display text — map it.
    const listText = comp.list?.items?.find((i: any) => i.value === value)
      ?.text;
    if (listText !== undefined) return listText;

    // Was this done before?
    // Is this done in the normal page controller
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

  /**
   * Returns an async function. This is called in plugin.ts when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]);
      const state = await cacheService.getState(request);

      // This needs to be fixed and logic should live in the main component
      if (request.payload?.next === "increment") {
        const nextIndex = this.nextIndex(state); // = list.length, the next free slot
        return h.redirect(
          `/${this.model.basePath}${this.path}?view=${nextIndex}`
        );
      }

      return h.redirect(this.getNext(request.payload));
    };
  }
}
