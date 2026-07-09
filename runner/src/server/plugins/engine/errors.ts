import { Boom } from "@hapi/boom";

export type ControllerErrorMetadata = {
  /** Controls what error page will be rendered */
  page?: string;
  /** The HTTP status code for the error */
  code: number;
};

export type RenderingErrorMetadata = {
  /** The HTTP status code for the error */
  code: number;
};

export type ApplicationErrorMetadata =
  | ControllerErrorMetadata
  | RenderingErrorMetadata;

/**
 * An error thrown from controllers when server actions fail.
 *
 * When handling the error, the hapi server will look the following files in the views folder:
 *  - `<PROJECT_ID>/example-error.html`
 *  - `<PROJECT_GROUP>/example-error.html`
 *  - `example-error.html`
 *  - `<PROJECT_ID>/500.html`
 *  - `<PROJECT_GROUP>/500.html`
 *  - `500.html`
 *
 * An example of this error is shown below:
 *
 * @example
 *
 * throw new ControllerError("Failed to find address", {
 *  code: 500,
 *  page: "example-error"
 * })
 */
export class ControllerError extends Boom {
  constructor(message: string, data: ControllerErrorMetadata) {
    super(`${ControllerError.name}: ${message}`, {
      data,
      statusCode: data.code,
    });
  }
}

/**
 * An error thrown from the rendering engine.
 *
 * This can be thrown when a form or page is not found. Or the page fails to render.
 *
 * When handling the error, the hapi server will look the following files in the views folder:
 *  - `<PROJECT_ID>/404.html`
 *  - `<PROJECT_GROUP>/404.html`
 *  - `404.html`
 *
 * An example of this error is shown below:
 *
 * @example
 *
 * throw new ControllerError("Failed to find address", {
 *  code: 404,
 * })
 */
export class RenderingError extends Boom {
  constructor(message: string, data: RenderingErrorMetadata) {
    super(`${RenderingError.name}: ${message}`, {
      data,
      statusCode: data.code,
    });
  }
}
