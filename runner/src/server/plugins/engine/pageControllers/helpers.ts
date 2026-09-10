import { Page } from "@xgovformbuilder/model";
import { camelCase, upperFirst } from "lodash";
import path from "path";
import { MultiStartPageController } from "server/plugins/engine/pageControllers/MultiStartPageController";
import { UploadPageController } from "server/plugins/engine/pageControllers/UploadPageController";
import { CheckpointSummaryPageController } from "src/server/plugins/engine/pageControllers/CheckpointSummaryPageController";
import { CustomSummaryPageController } from "./CustomSummaryPageController";
import { DateComparisonPageController } from "./DateComparisonPageController";
import { DeliveryAddressSameAsReportPageController } from "./DeliveryAddressSameAsReportPageController";
import { DobPageController } from "./DobPageController";
import { FindAnAddressPageController } from "./FindAnAddressPageController";
import { HomePageController } from "./HomePageController";
import { MagicLinkController } from "./MagicLinkController";
import { MagicLinkFirstSubmitPageController } from "./MagicLinkFirstSubmitPageController";
import { MagicLinkRedirectController } from "./MagicLinkRedirectController";
import { MagicLinkSecondSubmitPageController } from "./MagicLinkSecondSubmitPageController";
import { MagicLinkStartPageController } from "./MagicLinkStartPageController";
import { MiniSummaryPageController } from "./MiniSummaryPageController";
import { PageController } from "./PageController";
import { PageControllerBase } from "./PageControllerBase";
import { RepeatingFieldPageController } from "./RepeatingFieldPageController";
import { RepeatingSectionSummaryPageController } from "./RepeatingSectionSummaryPageController";
import { SelectAnAddressPageController } from "./SelectAnAddressPageController";
import { StartDatePageController } from "./StartDatePageController";
import { StartPageController } from "./StartPageController";
import { SummaryPageController } from "./SummaryPageController";
import { ManualAddressPageController } from "./ManualAddressPageController";
import { HeadlessSummaryPageController } from "./HeadlessSummaryPageController";

const PageControllers = {
  DobPageController,
  HomePageController,
  PageController,
  StartDatePageController,
  StartPageController,
  SummaryPageController,
  PageControllerBase,
  RepeatingFieldPageController,
  MiniSummaryPageController,
  UploadPageController,
  MultiStartPageController,
  RepeatingSectionSummaryPageController,
  CheckpointSummaryPageController,
  MagicLinkFirstSubmitPageController,
  MagicLinkSecondSubmitPageController,
  MagicLinkController,
  MagicLinkStartPageController,
  CustomSummaryPageController,
  DateComparisonPageController,
  MagicLinkRedirectController,
  FindAnAddressPageController,
  SelectAnAddressPageController,
  DeliveryAddressSameAsReportPageController,
  ManualAddressPageController,
  HeadlessSummaryPageController,
};

export const controllerNameFromPath = (filePath: string) => {
  const fileName = path.basename(filePath).split(".")[0];
  return `${upperFirst(camelCase(fileName))}PageController`;
};

/**
 * Gets the class for the controller defined in a {@link Page}
 */
export const getPageController = (nameOrPath: Page["controller"]) => {
  const isPath = !!path.extname(nameOrPath);
  const controllerName = isPath
    ? controllerNameFromPath(nameOrPath)
    : nameOrPath;

  return PageControllers[controllerName ?? "PageControllerBase"];
};
