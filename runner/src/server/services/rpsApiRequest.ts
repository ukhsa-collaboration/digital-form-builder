import { Schema } from "joi";
import { JsonApiIntegrationWithMsal } from "./jsonApiIntegrationWithMsal";
import { ControllerError } from "../plugins/engine/errors";

export async function postValidated<TData, TResponse>(
  client: JsonApiIntegrationWithMsal,
  path: string,
  schema: Schema,
  data: TData,
  failureMessage: string
): Promise<TResponse> {
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    throw new ControllerError(`Invalid data for ${path}: ${error.message}`, {
      code: 500,
    });
  }

  const response = await client.request(path, {
    method: "POST",
    body: JSON.stringify(value),
  });

  const body = await response.json();

  if (response.status !== 200) {
    throw new ControllerError(failureMessage, { code: 500 });
  }

  return body as TResponse;
}
