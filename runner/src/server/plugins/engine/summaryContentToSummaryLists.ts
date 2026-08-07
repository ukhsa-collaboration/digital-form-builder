import nunjucks from "nunjucks";
import { format, parseISO } from "date-fns";
import { RelativeUrl } from "./feedback/RelativeUrl";
import * as Components from "./components";
import { FormComponent } from "./components/FormComponent";

export type SummaryContentCase = { condition?: string; value: string };

export interface SummaryContentComponent {
  name: string;
  type: string;
  content: string | SummaryContentCase[];
  options?: Record<string, any>;
}

export type SummaryContentChangeUrlCase = { condition?: string; value: string };

export type SummaryConditionsMap = Record<
  string,
  { fn: (state: any) => boolean } | undefined
>;

export interface SummaryContentItem {
  title: string;
  value: string | SummaryContentComponent;
  changeUrl: string | false | SummaryContentChangeUrlCase[];
  type?: "component";
}

export interface SummaryContentSection {
  title: string;
  content: SummaryContentItem[];
}

export interface SummaryContentOptions {
  enableCards?: boolean | "true" | "false";
}

export interface GovukSummaryListRow {
  key: { text: string };
  value: { html: string } | { text: string };
  // Populated for display component types; the nunjucks template renders these
  // via the same generic dispatch used by componentList (partials/components.html).
  valueComponent?: {
    type: string;
    isFormComponent: boolean;
    model: Record<string, any>;
  };
  actions?: {
    items: Array<{ href: string; text: string; visuallyHiddenText: string }>;
  };
}

export interface GovukSummaryList {
  card?: { title: { text: string } };
  rows: GovukSummaryListRow[];
}

export function summaryContentToSummaryLists(
  sections: SummaryContentSection[],
  state: Record<string, any>,
  options: SummaryContentOptions = {},
  conditions: SummaryConditionsMap = {},
  basePath = "",
  formModel: any = null
): GovukSummaryList[] {
  const enableCards =
    options.enableCards === true || options.enableCards === "true";

  return sections.map((section) => {
    const summaryList: GovukSummaryList = {
      rows: section.content.map((item) =>
        buildRow(item, state, conditions, basePath, formModel)
      ),
    };

    if (enableCards) {
      summaryList.card = { title: { text: section.title } };
    }

    return summaryList;
  });
}

function buildRow(
  item: SummaryContentItem,
  state: Record<string, any>,
  conditions: SummaryConditionsMap,
  basePath: string,
  formModel: any
): GovukSummaryListRow {
  const row: GovukSummaryListRow = {
    key: { text: item.title },
    value: { text: "" },
  };

  if (item.type === "component" && typeof item.value === "object") {
    const comp = item.value as SummaryContentComponent;
    const CompClass = (Components as any)[comp.type];

    if (CompClass && !(CompClass.prototype instanceof FormComponent)) {
      // Display component: pre-resolve conditional content, instantiate the
      // class, and delegate rendering to its nunjucks macro. The template uses
      // the same dynamic-import dispatch as componentList, so any registered
      // display component type works automatically.
      const resolvedContent = resolveContent(comp.content, state, conditions);
      const instance = new CompClass(
        { ...comp, content: resolvedContent, options: comp.options ?? {} },
        formModel
      );
      row.valueComponent = {
        type: comp.type,
        isFormComponent: false,
        model: instance.getViewModel(state),
      };
    } else if (CompClass) {
      // Form field component: the macro renders an input widget, which is
      // inappropriate inside a summary cell. Pre-render to a plain text value.
      row.value = resolveFormFieldValue(comp, state);
    } else {
      row.value = resolveValue(item, state);
    }
  } else {
    row.value = resolveValue(item, state);
  }

  const changeUrl = resolveChangeUrl(item.changeUrl, state, conditions);

  if (changeUrl !== false) {
    // mirrors the `/${model.basePath}${path}` convention used by every
    // other change-link/redirect in the engine, e.g. SummaryViewModel.ts,
    // including appending a `returnUrl` back to the summary page so the
    // page being changed can send the user back here on submit.
    const href = basePath ? `/${basePath}${changeUrl}` : changeUrl;
    const returnUrl = basePath ? `/${basePath}/summary` : "/summary";
    const relativeUrl = new RelativeUrl(href).setParam("returnUrl", returnUrl);

    row.actions = {
      items: [
        {
          href: relativeUrl.toString(),
          text: "Change",
          visuallyHiddenText: item.title.toLowerCase(),
        },
      ],
    };
  }

  return row;
}

function resolveChangeUrl(
  changeUrl: SummaryContentItem["changeUrl"],
  state: Record<string, any>,
  conditions: SummaryConditionsMap
): string | false {
  if (!Array.isArray(changeUrl)) {
    return changeUrl;
  }

  // An unknown/typo condition name is treated as non-matching rather than
  // thrown, since a form-author mistake here must not break the whole
  // summary page render.
  const match = changeUrl.find(
    (item) =>
      !item.condition || conditions[item.condition]?.fn?.(state) === true
  );

  return match ? match.value : false;
}

function resolveContent(
  content: SummaryContentComponent["content"],
  state: Record<string, any>,
  conditions: SummaryConditionsMap
): string {
  if (!Array.isArray(content)) {
    return content;
  }

  const match = content.find(
    (item) =>
      !item.condition || conditions[item.condition]?.fn?.(state) === true
  );

  return match ? match.value : "";
}

function resolveValue(
  item: SummaryContentItem,
  state: Record<string, any>
): { html: string } | { text: string } {
  if (item.type === "component" && typeof item.value === "object") {
    return resolveFormFieldValue(item.value, state);
  }

  const rendered = nunjucks.renderString(item.value as string, state);
  return { html: rendered };
}

// Pre-renders form-field component values to a plain text representation
// suitable for a summary cell. These types have isFormComponent = true, so
// their nunjucks macros render full input widgets rather than display-only HTML.
function resolveFormFieldValue(
  comp: SummaryContentComponent,
  state: Record<string, any>
): { html: string } | { text: string } {
  switch (comp.type) {
    case "DatePartsField":
    case "DateField": {
      const val = state[comp.name];
      return { text: val ? format(parseISO(val), "d MMMM yyyy") : "" };
    }

    case "DateTimePartsField":
    case "DateTimeField": {
      const val = state[comp.name];
      return { text: val ? format(parseISO(val), "d MMMM yyyy h:mm") : "" };
    }

    case "UkAddressField": {
      const val = state[comp.name];
      return {
        text: val
          ? [val.addressLine1, val.addressLine2, val.town, val.postcode]
              .filter(Boolean)
              .join(", ")
          : "",
      };
    }

    case "MonthYearField": {
      const values = state[comp.name];
      const year = values?.[`${comp.name}__year`] ?? "Not supplied";
      const monthValue = values?.[`${comp.name}__month`];
      let monthString = "Not supplied";
      if (monthValue) {
        const date = new Date();
        date.setMonth(monthValue - 1);
        monthString = date.toLocaleString("default", { month: "long" });
      }
      return { text: `${monthString} ${year}` };
    }

    case "CheckboxesField": {
      // Raw array join — full label resolution requires the form model's items list
      const val = state[comp.name];
      return { text: Array.isArray(val) ? val.join(", ") : String(val ?? "") };
    }

    default:
      return { text: String(state[comp.name] ?? "") };
  }
}
