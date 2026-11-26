import { HapiRequest } from "server/types";
import {
  getTimeoutParamsFromState,
  timeoutPreservedParamKeys,
} from "../helpers";

// Exposes the preserved parameters (r and d) from the user's current answers to the page
export async function getPrePopParams(
  request: HapiRequest
): Promise<Record<string, string>> {
  const model = request.server.app.forms?.[request.params.id];

  if (!model || !request.yar?.id) {
    return {};
  }

  const prePopFields = model.fieldsForPrePopulation;

  // Only forms with pre-populated r/d need the answers read; others skip the cache call
  if (!timeoutPreservedParamKeys.some((key) => prePopFields[key])) {
    return {};
  }

  try {
    const { cacheService } = request.services([]);
    const state = await cacheService.getState(request);

    return getTimeoutParamsFromState(prePopFields, state);
  } catch (error) {
    request.logger?.warn(
      ["prePopParams"],
      `Unable to read preserved parameters: ${error}`
    );
    return {};
  }
}
