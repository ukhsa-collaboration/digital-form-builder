import { Policy, PolicyOptions } from "@hapi/catbox";
import { HapiRequest, HapiServer } from "../types";
import { CacheService } from "./cacheService";

export class CrossFormCacheService {
  cacheService: CacheService;

  crossFormIdBySessionCache: TypedCache<FormIdBySessionIdRecord>;
  crossFormReturnDataByTransferId: TypedCache<CrossFormReturnDataByTransferId>;
  ttl = 1000 * 60 * 60 * 24; // 24 hours

  constructor(server: HapiServer) {
    const { cacheService } = server.services([]);
    this.cacheService = cacheService;
    this.crossFormIdBySessionCache = cacheService.cache as TypedCache<
      FormIdBySessionIdRecord
    >;
    this.crossFormReturnDataByTransferId = cacheService.cache as TypedCache<
      CrossFormReturnDataByTransferId
    >;
  }

  // STEP 1
  async saveFormIdBeforeCrossFormRedirectToAllowResume(request: HapiRequest) {
    /* Cross Form Redirect Session Resume Step 1: Save the form id before redirecting to the cross form
       Saves form id by session id, to allow retrieval in the cross form flow 
    */
    console.log("Here I am in saveFormIdBeforeCrossFormRedirectToAllowResume");
    const sessionId = request.yar.id;

    /* Form id being redirected to cross form from, for example "ReportAnOutbreak" */
    const formId = request.params.id as string;

    if (!sessionId || !formId) {
      request.logger.error("Cross Form Redirect: Missing data in step 1", {
        sessionId,
        formId,
      });

      return;
    }
    console.log("CrossFormCacheService: Saving formId for sessionId", {
      sessionId,
      formId,
    });
    const key = getFormIdBySessionIdKey(sessionId);
    await this.crossFormIdBySessionCache.set(key, { formId }, this.ttl); // Set the form id in cache with a TTL of 24 hours
  }

  // STEP 2
  async saveInformationToAllowCrossFormResume(
    request: HapiRequest,
    transferId: string
  ) {
    /* Cross Form Redirect Session Resume Step 2: Save additional information when sending out the cross form
      In order to be able to re-populate the state after cross form has been clicked without relying on browser state we save the current:
      - session id (as a new session will be started when opening in a differnt browser)
      - form id (i.e "ReportAnOutbreak", to know which cache key to retrieve state from)
    */
    const sessionId = request.yar.id;
    const crossFormFormId = request.params.id as string;

    console.log("Here I am in saveInformationToAllowCrossFormResume");
    console.log("STEP 2", {
      sessionId,
      crossFormFormId,
    });

    if (!sessionId || !crossFormFormId) {
      request.logger.error("Cross Form Redirect: Missing data in step 2", {
        sessionId,
        crossFormFormId,
      });

      return;
    }

    /* Retrieve form id using the FormIdBySessionIdLookup */
    const previousFormEntry = await this.crossFormIdBySessionCache.get(
      getFormIdBySessionIdKey(sessionId)
    );

    const key = getFormIdBySessionIdKey(sessionId);

    console.log("STEP 2 KEY", key);

    console.log("STEP 2 LOOKUP RESULT", previousFormEntry);

    if (!previousFormEntry) {
      request.logger.error("Cross Form Redirect: Missing data in step 2", {
        sessionId,
        crossFormFormId,
        previousFormEntry,
      });

      return;
    }

    /* Save information required to populate state from previous session */
    await this.crossFormReturnDataByTransferId.set(
      getReturnDataByTransferId(transferId),
      {
        sessionId,
        formId: previousFormEntry.formId,
      },
      this.ttl
    );

    const check = await this.crossFormReturnDataByTransferId.get(
      getReturnDataByTransferId(transferId)
    );
    console.log("STEP 2 VERIFY SAVE", check);

    // Clean up the temporary form id by session id entry
    await this.crossFormIdBySessionCache.drop(
      getFormIdBySessionIdKey(sessionId)
    );
  }

  // STEP 3
  async restoreInformationFromCrossFormResume(
    request: HapiRequest,
    transferId: string
  ) {
    /* Cross Form Redirect Session Resume Step 3: Restore information when returning from the cross form
      Retrieve the session id and form id from the cache using the transfer id, to allow repopulation of state in the original form flow
    */
    const crossDataRestoreEntry = await this.crossFormReturnDataByTransferId.get(
      getReturnDataByTransferId(transferId)
    );
    if (!crossDataRestoreEntry) {
      request.logger.error(
        "Cross Form Redirect: Missing data in step 3 (crossDataRestoreEntry undefined)"
      );
      return;
    }
    const currentSessionId = request.yar.id;
    const crossFormFormId = request.params.id as string;

    const {
      sessionId: previousSessionId,
      formId: previousFormId,
    } = crossDataRestoreEntry;

    // Log cache data for poc purposes
    console.log("RESTORE STEP 3", {
      previousSessionId,
      previousFormId,
      currentSessionId,
      crossFormFormId,
      sameSession: previousSessionId === currentSessionId,
    });

    if (!currentSessionId || !previousSessionId || !previousFormId) {
      request.logger.error("Cross Form Redirect: Missing data in step 3", {
        currentSessionId,
        previousSessionId,
        previousFormId,
      });
      return;
    }

    // WE ARE IN THE SAME BROWSER, SO THIS MAY BE UNNECESSARY, BUT WE WILL KEEP IT FOR NOW
    if (currentSessionId === previousSessionId) {
      /* Continuing in same browser, no need to repopulate previous state */
      request.logger.info("Same session detected");
    }

    /* Continuing in different session (different browser / new browser / new instance / tab)
       Re-instate form states from previous session 
    */
    await this.mergeFormStateFromPreviousSession({
      previousSessionId,
      currentSessionId,
      formId: crossFormFormId,
    });

    const restoredPreviousFormState = await this.getFormState(
      currentSessionId,
      previousFormId
    );
    // Log cache data for poc purposes
    console.log(
      "RESTORED FORM 1 STATE",
      JSON.stringify(restoredPreviousFormState, null, 2)
    );

    await this.mergeFormStateFromPreviousSession({
      previousSessionId,
      currentSessionId,
      formId: previousFormId,
    });
    const restoredCrossFormState = await this.getFormState(
      currentSessionId,
      crossFormFormId
    );
    // Log cache data for poc purposes
    console.log(
      "RESTORED FORM 2 STATE",
      JSON.stringify(restoredCrossFormState, null, 2)
    );

    /* Cleaning up state from previous session */
    await this.clearFormState(previousSessionId, crossFormFormId);
    await this.clearFormState(previousSessionId, previousFormId);

    /* Delete Cross Form Lookup Entry */
    await this.crossFormReturnDataByTransferId.drop(
      getReturnDataByTransferId(transferId)
    );
  }

  private async mergeFormStateFromPreviousSession({
    previousSessionId,
    currentSessionId,
    formId,
  }: {
    previousSessionId: string;
    currentSessionId: string;
    formId: string;
  }) {
    const previousFormState = await this.getFormState(
      previousSessionId,
      formId
    );

    await this.mergeFormState(currentSessionId, formId, previousFormState);
  }

  private async getFormState(sessionId: string, formId: string) {
    return await this.cacheService.getState({
      params: { id: formId },
      yar: { id: sessionId },
    });
  }
  private async mergeFormState(
    sessionId: string,
    formId: string,
    value: Record<string, any>
  ) {
    return await this.cacheService.mergeState(
      {
        params: { id: formId },
        yar: { id: sessionId },
      },
      value
    );
  }

  private async clearFormState(sessionId: string, formId: string) {
    if (sessionId && formId) {
      await this.cacheService.clearState({
        params: { id: formId },
        yar: { id: sessionId },
      });
    }
  }
}

type TypedCache<T> = Policy<T, PolicyOptions<T>>;
type FormIdBySessionIdRecord = { formId: string };
const getFormIdBySessionIdKey = (sessionId: string) => {
  return `cross_form_id_by_session:${sessionId.toLocaleLowerCase()}`;
};
type CrossFormReturnDataByTransferId = { sessionId: string; formId: string };
const getReturnDataByTransferId = (transferId: string) => {
  return `cross_form_return_data_by_transfer_id:${transferId.toLocaleLowerCase()}`;
};
