import { HapiRequest, HapiResponseToolkit } from "server/types";
import { getOrCreateCorrelationId } from "server/utils/correlationId";

/**
 * Prehandler that parses the payload and finds Buffers (i.e. files).
 */
export function getFiles(request: HapiRequest, _h: HapiResponseToolkit) {
  const { uploadService } = request.services([]);
  const files = uploadService.fileStreamsFromPayload(request.payload);
  if (files.length) {
    request.server.logger.info(
      { id: getOrCreateCorrelationId(request), path: request.path },
      `Found ${uploadService.fileSummary(files)} to process on ${request.path}`
    );
    return files;
  }

  return null;
}
