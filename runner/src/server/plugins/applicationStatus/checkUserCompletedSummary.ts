import { HapiRequest, HapiResponseToolkit } from "server/types";

export async function checkUserCompletedSummary(
  request: HapiRequest,
  h: HapiResponseToolkit
) {
  const { cacheService } = request.services([]);

  const state = await cacheService.getState(request);

  console.log("USER COMPLETED SUMMARY ::", state?.userCompletedSummary);

  if (state?.userCompletedSummary !== true) {
    request.logger.error(
      [`/${request.params.id}/status`],
      `${request.yar.id} user has incomplete state, redirecting to /summary`
    );
    return h.redirect(`/${request.params.id}/summary`).takeover();
  }

  return state.userCompletedSummary;
}
