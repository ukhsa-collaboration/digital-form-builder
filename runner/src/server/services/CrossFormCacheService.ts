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

  async saveFormIdBeforeCrossFormRedirectToAllowResume(request: HapiRequest) {
    /* Cross Form Redirect Session Resume Step 1: Save the form id before redirecting to the cross form
       Saves form id by session id, to allow retrieval in the cross form flow 
    */
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

    // Clean up the temporary form id by session id entry
    await this.crossFormIdBySessionCache.drop(
      getFormIdBySessionIdKey(sessionId)
    );
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
