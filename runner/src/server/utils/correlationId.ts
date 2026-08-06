import { v4 as uuidv4 } from "uuid";
import { HapiRequest } from "server/types";

export function getOrCreateCorrelationId(request: HapiRequest): string {
  let id = request.yar.get("correlationId");
  if (!id) {
    id = uuidv4();
    request.yar.set("correlationId", id);
  }
  return id;
}
