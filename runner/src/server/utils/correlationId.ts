import { v4 as uuidv4 } from "uuid";
import { HapiRequest } from "server/types";
import { CacheService } from "server/services";

export function getOrCreateCorrelationId(request: HapiRequest): string {
  let id = request.yar.get("correlationId");

  if (!id) {
    id = uuidv4();
    request.yar.set("correlationId", id);

    request.logger.trace([
      "getOrCreateCorrelationId",
      `Created new correlation ID: ${id}`,
    ]);
  }

  return id;
}

export async function destroySession(
  request: HapiRequest,
  cacheService: CacheService
): Promise<void> {
  request.logger.trace([
    "destroySession",
    "Destroying session and clearing correlation ID",
  ]);

  await cacheService.clearState(request);
  request.yar.clear("correlationId");

  request.yar.reset();

  request.logger.trace(["destroySession", "Session destroyed"]);
}
