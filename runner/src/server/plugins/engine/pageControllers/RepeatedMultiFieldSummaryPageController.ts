import { PageController } from "server/plugins/engine/pageControllers/PageController";
import {
  HapiRequest,
  HapiResponseToolkit,
  HapiLifecycleMethod,
} from "server/types";
import { RepeatingFieldPageController } from "./RepeatingFieldPageController";
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
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]); // Unsure what this line does

      const { removeAtIndex } = request.query;
      if (removeAtIndex ?? false) {
        return this.removeAtIndex(request, h); // Unsure about this line as well
      }

      const state = await cacheService.getState(request);
      const { progress = [] } = state;

      // Unsure what the purpose of this line is as well
      progress?.push(`/${this.model.basePath}${this.path}?view=summary`);
      await cacheService.mergeState(request, { progress });

      const viewModel = this.getViewModel(state);

      console.log("MultiFieldSummary makeGetRouteHandler end");
      return h.view("repeating-multi-field-summary", viewModel);
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

  // I don't understand why there is a seprate get view model function
  // Is the view model not defined by the template
  getViewModel(formData) {
    const baseViewModel = super.getViewModel(formData);

    // Unsure what the purpose of get partial state is if we are passign in thw whole state
    const answers = this.getPartialState(formData);

    // I believe this cas to be changed to something like get cards from answers
    const rows = this.getRowsFromAnswers(answers, "summary");

    // Ok this will allow me to change the way I pass in the details
    return {
      ...baseViewModel,
      customText: this.options.customText,
      details: { rows },
    };
  }

  getRowsFromAnswers(answers, view = false) {
    const { title = "" } = this.inputComponent;
    const listValueToText = this.inputComponent.list?.items?.reduce(
      (prev, curr) => ({ ...prev, [curr.value]: curr.text }),
      {}
    );

    return answers?.map((value, i) => {
      const titleWithIteration = `${title} ${i + 1}`;
      return {
        key: {
          text: titleWithIteration,
          classes: `${
            // Probably should remove this or do it another way
            this.hideRowTitles ? "govuk-summary-list__row--hidden-titles" : ""
          }`,
        },
        value: {
          text: listValueToText?.[value] ?? value,
          classes: `${
            this.hideRowTitles ? "govuk-summary-list__key--hidden-titles" : ""
          }`,
        },
        actions: {
          items: [
            {
              href: `?removeAtIndex=${i}${view ? `&view=${view}` : ``}`,
              text: "Remove",
              visuallyHiddenText: titleWithIteration,
            },
          ],
        },
      };
    });
  }

  /**
   * Returns an async function. This is called in plugin.ts when there is a POST request at `/{id}/{path*}`.
   * If a form is incomplete, a user will be redirected to the start page.
   */
  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const { cacheService } = request.services([]);
      const state = await cacheService.getState(request);

      if (request.payload?.next === "increment") {
        const nextIndex = this.nextIndex(state);
        return h.redirect(
          `/${this.model.basePath}${this.path}?view=${nextIndex}`
        );
      }

      return h.redirect(this.getNext(request.payload));
    };
  }
}
