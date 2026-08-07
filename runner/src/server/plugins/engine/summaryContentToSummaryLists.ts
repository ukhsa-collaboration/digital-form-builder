import nunjucks from "nunjucks";
import { format, parseISO } from "date-fns";
import { RelativeUrl } from "./feedback/RelativeUrl";

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
  basePath = ""
): GovukSummaryList[] {
  const enableCards =
    options.enableCards === true || options.enableCards === "true";

  return sections.map((section) => {
    const summaryList: GovukSummaryList = {
      rows: section.content.map((item) =>
        buildRow(item, state, conditions, basePath)
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
  basePath: string
): GovukSummaryListRow {
  const row: GovukSummaryListRow = {
    key: { text: item.title },
    value: resolveValue(item, state, conditions),
  };

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
  state: Record<string, any>,
  conditions: SummaryConditionsMap
): { html: string } | { text: string } {
  if (item.type === "component" && typeof item.value === "object") {
    return resolveComponentValue(item.value, state, conditions);
  }

  const rendered = nunjucks.renderString(item.value as string, state);
  return { html: rendered };
}

function resolveComponentValue(
  comp: SummaryContentComponent,
  state: Record<string, any>,
  conditions: SummaryConditionsMap
): { html: string } | { text: string } {
  const content = resolveContent(comp.content, state, conditions);

  switch (comp.type) {
    case "DisplayAddress":
    case "Para":
    case "ContentWithState":
      return { html: nunjucks.renderString(content, state) };

    case "Html":
      return { html: content };

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
