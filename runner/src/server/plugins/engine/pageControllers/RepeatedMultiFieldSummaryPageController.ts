import { PageController } from "server/plugins/engine/pageControllers/PageController";
import {
  HapiRequest,
  HapiResponseToolkit,
  HapiLifecycleMethod,
} from "server/types";
import { RepeatingFieldPageController } from "./RepeatingFieldPageController";
import { summaryDetailsTransformationMap } from "...";
import { clone } from "...";
import { logger } from "...";
export class RepeatedMultiFieldSummaryPageController extends PageController {
  private getRoute!: HapiLifecycleMethod;
  private postRoute!: HapiLifecycleMethod;
  nextIndex!: RepeatingFieldPageController["nextIndex"];
  getPartialState!: RepeatingFieldPageController["getPartialState"];
  options!: RepeatingFieldPageController["options"];
  removeAtIndex!: RepeatingFieldPageController["removeAtIndex"];

  sectionKey: string;

  constructor(model, pageDef, sectionKey) {
    super(model, pageDef);
    this.sectionKey = sectionKey;
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
   * The controller which is used when Page["controller"] is defined as "./pages/summary.js"
   */

  /**
   * Returns an async function. This is called in plugin.ts when there is a GET request at `/{id}/{path*}`,
   */
  makeGetRouteHandler() {
    console.log("MultiFieldSummary makeGetRouteHandler");
    // TODO TODO TODO FAILS HERE SGIYKD JUST SKIP FOR NOW
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]); // Unsure what this line does

      // const { removeAtIndex } = request.query;
      // if (removeAtIndex ?? false) {
      //   return this.removeAtIndex(request, h); // Unsure about this line as well
      // }

      const state = await cacheService.getState(request);
      const { progress = [] } = state; // I forget what this was used for TODO: re - insert

      // Unsure what the purpose of this line is as well
      // progress?.push(`/${this.model.basePath}${this.path}?view=summary`);
      // await cacheService.mergeState(request, { progress });

      const viewModel = this.getViewModel(state);
      console.log(
        "View model in multi-field summary page controller",
        viewModel
      );

      return h.view("repeating-multi-field-summary", viewModel);
      // };
    };
  }

  entryToViewModelRow = ([key, value], iteration) => {
    const componentDef = this.pageDef.components.filter(
      (component) => component.name === key
    );

    const { title } = componentDef;
    const titleWithIteration = `${title} ${iteration + 1}`;
    return {
      key: {
        text: titleWithIteration,
      },
      value: {
        text: value,
      },
      actions: {
        items: [
          {
            href: `?view=${iteration}`,
            text: "change",
            visuallyHiddenText: titleWithIteration,
          },
        ],
      },
    };
  };

  getViewModel(formData: any) {
    const baseViewModel = super.getViewModel(formData);
    const entries = this.getPartialState(formData) ?? [];

    // 1. Build details in the canonical SummaryViewModel shape.
    let details = this.buildDetails(entries);

    // 2. Run the per-form transform against that shape (same pattern as SummaryViewModel).
    const transformDetails =
      summaryDetailsTransformationMap[this.model.basePath];
    if (transformDetails) {
      const clonedDetails = clone(details);
      try {
        details = transformDetails(clonedDetails);
      } catch (err) {
        logger.error({ err }, "Error transforming repeating-section summary");
      }
    }

    // 3. Map the (possibly transformed) details into govuk summary cards.
    return {
      ...baseViewModel,
      customText: this.options.customText,
      details: { cards: this.detailsToCards(details) },
    };
  }

  private buildDetails(entries: Array<Record<string, unknown>>) {
    return entries.map((entry, index) => ({
      name: `${this.sectionKey}.${index}`,
      title: this.cardTitle(index),
      index, // kept so detailsToCards can recover the entry index post-transform
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

    // Composite components (e.g. ContactDetailsCollection) store an object.
    if (typeof value === "object") {
      return Object.values(value as Record<string, unknown>)
        .filter((v) => v !== undefined && v !== null && v !== "")
        .join(", ");
    }

    return String(value);
  }

  private detailsToCards(details: any[]) {
    return details.map((detail, i) => {
      const index = detail.index ?? i;
      const title = detail.title ?? this.cardTitle(index);
      return {
        card: {
          title: { text: title },
          actions: {
            items: [
              {
                href: `?view=${index}`,
                text: "Change",
                visuallyHiddenText: title,
              },
              {
                href: `?removeAtIndex=${index}`,
                text: "Remove",
                visuallyHiddenText: title,
              },
            ],
          },
        },
        rows: (detail.items ?? [])
          .filter((item: any) => item.value !== "" && item.value != null)
          .map((item: any) => ({
            key: { text: item.label ?? item.name },
            value: { text: item.value },
          })),
      };
    });
  }

  // I think this function is no longer used
  // getRowsFromAnswers(answers, view = false) {
  //   const { title = "" } = this.inputComponent;
  //   const listValueToText = this.inputComponent.list?.items?.reduce(
  //     (prev, curr) => ({ ...prev, [curr.value]: curr.text }),
  //     {}
  //   );

  //   return answers?.map((value, i) => {
  //     const titleWithIteration = `${title} ${i + 1}`;
  //     return {
  //       key: {
  //         text: titleWithIteration,
  //         classes: `${
  //           // Probably should remove this or do it another way
  //           this.hideRowTitles ? "govuk-summary-list__row--hidden-titles" : ""
  //         }`,
  //       },
  //       value: {
  //         text: listValueToText?.[value] ?? value,
  //         classes: `${
  //           this.hideRowTitles ? "govuk-summary-list__key--hidden-titles" : ""
  //         }`,
  //       },
  //       actions: {
  //         items: [
  //           {
  //             href: `?removeAtIndex=${i}${view ? `&view=${view}` : ``}`,
  //             text: "Remove",
  //             visuallyHiddenText: titleWithIteration,
  //           },
  //         ],
  //       },
  //     };
  //   });
  // }

  /**
   * Returns an async function. This is called in plugin.ts when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]);
      const state = await cacheService.getState(request);

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
