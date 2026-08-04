import { HapiRequest, HapiResponseToolkit } from "src/server/types";
import { PageController } from "./PageController";

const INTERNAL_KEYS = [
  "progress",
  "outputs",
  "webhookData",
  "userCompletedSummary",
];

export class CrossFormReturnController extends PageController {
  constructor(model, pageDef) {
    super(model, pageDef);
  }
  /** The form we sent the user to — first segment of toggleRedirect. */
  get sourceFormId(): string | null {
    // Todo: move this to be one of the optional parameters of page controller instead
    // TODO: this works with the assumption tha path you have come form is the same as the path you have set can be improved
    const toggle = this.model.def.toggleRedirect; // I believe this erros just because it is not included as part of the page def
    return toggle ? toggle.replace(/^\//, "").split("/")[0] : null;
  }

  get landingPath() {
    return `/${this.model.basePath}/check-your-details`;
  }

  makeGetRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      // TODO: fix redirection logic and extraction of parameters
      const { cacheService } = request.services([]);
      const sessionId = request.yar?.id;
      const sourceFormId = this.sourceFormId;

      if (!sessionId || !sourceFormId) {
        request.logger.error(["CrossForm", "Missing session or source form"]);
        return h.redirect(this.landingPath).code(302);
      }

      const sourceKey = {
        params: { id: sourceFormId },
        yar: { id: sessionId },
      };

      const sourceState = await cacheService.getState(sourceKey);
      const targetState = await cacheService.getState(request);

      console.log("MICOL PRINTING SOURCE STATE", sourceState);

      const progress = this.mergeProgress(sourceState, targetState);
      // getState returns {} on a miss — check emptiness, not falsiness.
      const answers = Object.fromEntries(
        Object.entries(sourceState).filter(([k]) => !INTERNAL_KEYS.includes(k))
      );

      if (!Object.keys(answers).length) {
        request.logger.warn([
          "CrossForm",
          `No state for ${sourceFormId} under session ${sessionId}`,
        ]);
        return h.redirect(this.landingPath).code(302);
      }

      // TODO: look at how we want to merge state from the cache service
      await cacheService.mergeState(request, answers);
      await cacheService.mergeState(request, { ...answers, progress });

      const newstate = await cacheService.getState(request);
      console.log("MICOL NEW STATE", newstate);
      await cacheService.clearState(sourceKey);

      request.logger.info([
        "CrossForm",
        `Merged ${Object.keys(answers).join(", ")} from ${sourceFormId}`,
      ]);

      return h.redirect(this.landingPath).code(302);
    };
  }

  private mergeProgress(sourceState: any, targetState: any): string[] {
    const sourceProgress: string[] = sourceState.progress ?? [];
    const targetProgress: string[] = targetState.progress ?? [];

    // Source first: the user was there before arriving back here.
    const combined = [...sourceProgress, ...targetProgress];

    // Collapse consecutive duplicates and any repeat visits.
    const seen = new Set<string>();
    return combined.filter((path) => {
      if (seen.has(path)) return false;
      seen.add(path);
      return true;
    });
  }
}
