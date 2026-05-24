import { PageController } from "server/plugins/engine/pageControllers/PageController";
import {
  HapiRequest,
  HapiResponseToolkit,
  HapiLifecycleMethod,
} from "server/types";
import { RepeatingFieldPageController } from "./RepeatingFieldPageController";
// TODO: re-insert summay details transformation
// import { SummaryDetailsTransformationMap } from "./summaryDetailsTransformations";
import { clone } from "hoek";

// import pino from "pino";
// const logger = pino().child({
//   name: "RepeatedMultiFieldSummaryPageController",
// });

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

  /**
   * Returns an async function. This is called in plugin.ts when there is a GET request at `/{id}/{path*}`,
   */
  makeGetRouteHandler() {
    console.log("MultiFieldSummary makeGetRouteHandler");
    // TODO TODO TODO FAILS HERE SGIYKD JUST SKIP FOR NOW
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]); // Unsure what this line does

      const { removeAtIndex } = request.query;
      console.log("micol, micol micol", removeAtIndex);
      if (removeAtIndex ?? false) {
        console.log(
          "removeAtIndex query param detected, calling removeAtIndex handler"
        );
        return this.removeAtIndex(request, h); // Unsure about this line as well
      }

      const state = await cacheService.getState(request);
      const { progress = [] } = state; // I forget what this was used for TODO: re - insert

      // Unsure what the purpose of this line is as well
      progress?.push(`/${this.model.basePath}${this.path}?view=summary`);
      await cacheService.mergeState(request, { progress });

      const viewModel = this.getViewModel(state);
      console.log(
        "View model in multi-field summary page controller",
        viewModel
      );

      // Check this has already filtered out only the relevant entries
      return h.view("repeating-multi-field-summary", viewModel);
      // };
    };
  }

  // entryToViewModelRow = ([key, value], iteration) => {
  //   const componentDef = this.pageDef.components.filter(
  //     (component) => component.name === key
  //   );

  //   const { title } = componentDef;
  //   const titleWithIteration = `${title} ${iteration + 1}`;
  //   return {
  //     key: {
  //       text: titleWithIteration,
  //     },
  //     value: {
  //       text: value,
  //     },
  //     actions: {
  //       items: [
  //         {
  //           href: `?view=${iteration}`,
  //           text: "change",
  //           visuallyHiddenText: titleWithIteration,
  //         },
  //       ],
  //     },
  //   };
  // };

  // TODO: consider moving this view model to a seprate class we instantiate in the controller
  // This class could inherit from the normal Summary View model
  getViewModel(formData: any) {
    const baseViewModel = super.getViewModel(formData);
    const entries = this.getPartialState(formData) ?? [];

    let details = this.buildDetails(entries);

    return {
      ...baseViewModel,
      customText: this.options.customText,
      details, // ← array in the old shape, fed straight to the summaryCard macro
      returnUrl: this.returnUrl,
    };
  }

  private buildDetails(entries: Array<Record<string, unknown>>) {
    return entries.map((entry, index) => ({
      name: String(index), // macro delete link → ?remove={{ data.name }}
      title: this.cardTitle(index), // "Item 1"
      index,
      card: `?view=${index}`, // macro change link → href="{{ data.card }}"
      items: (this.inputComponents ?? []).map((comp: any) => ({
        name: comp.name,
        label: comp.title ?? comp.name,
        value: this.formatValue(comp, entry[comp.name]),
        url: `/${this.model.basePath}${this.path}?view=${index}`,
      })),
    }));
  }

  private cardTitle(index: number): string {
    const tmpl = (this.options?.customText as any)?.cardTitle ?? "Item {index}";
    return tmpl.replace("{index}", String(index + 1));
  }

  private formatValue(comp: any, value: unknown): string {
    if (value === undefined || value === null || value === "") return "";

    // Selection fields store a value but display text — map it.
    const listText = comp.list?.items?.find((i: any) => i.value === value)
      ?.text;
    if (listText !== undefined) return listText;

    // Dates store ISO strings — format them.
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

      // This Correctly re-directs back to the next page
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
