import { FormModel } from "server/plugins/engine/models";

export interface SummaryItem {
  name: string;
  value: string;
  rawValue: unknown;
  label?: string;
  title?: string;
  url?: string;
  pageId?: string;
  inError?: boolean;
}

export interface SummarySection {
  name: string;
  title: string;
  items: SummaryItem[];
  card?: string;
}

type TransformFunction = <Details>(value: Details) => Details;

/**
 * This is a Record of FormModel basePath to transformation function,
 * e.g.
 * ```
 *   {
 *     // test.json basePath will be "test"
 *     "test": (value) => value,
 *   }
 *   ```
 */
export type SummaryDetailsTransformationMap = Record<
  FormModel["basePath"],
  TransformFunction
>;
