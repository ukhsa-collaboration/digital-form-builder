export type RpsApiResponse<T> =
  | {
      /* API call valid and successful */
      success: true;
      /* positive data response */
      data: T;
    }
  | {
      /* Is the API call invalid e.g. 4XX, 5XX */
      success: false;
      /* negative error response */
      error: string;
    };
