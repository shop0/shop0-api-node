import querystring, { ParsedUrlQueryInput } from "querystring";
import crypto from "crypto";
import fs from "fs";

import fetch, { RequestInit, Response } from "node-fetch";
import { Method, StatusCode } from "@shop0/network";

import * as shop0Errors from "../../error";
import { shop0_API_LIBRARY_VERSION } from "../../version";
import validateShop from "../../utils/shop-validator";
import { Context } from "../../context";

import {
  DataType,
  GetRequestParams,
  PostRequestParams,
  PutRequestParams,
  DeleteRequestParams,
  RequestParams,
  RequestReturn,
} from "./types";

class HttpClient {
  // 1 second
  static readonly RETRY_WAIT_TIME = 1000;
  // 5 minutes
  static readonly DEPRECATION_ALERT_DELAY = 300000;
  private LOGGED_DEPRECATIONS: Record<string, number> = {};

  public constructor(private domain: string) {
    if (!validateShop(domain)) {
      throw new shop0Errors.InvalidShopError(`Domain ${domain} is not valid`);
    }

    this.domain = domain;
  }

  /**
   * Performs a GET request on the given path.
   */
  public async get(params: GetRequestParams): Promise<RequestReturn> {
    return this.request({ method: Method.Get, ...params });
  }

  /**
   * Performs a POST request on the given path.
   */
  public async post(params: PostRequestParams): Promise<RequestReturn> {
    return this.request({ method: Method.Post, ...params });
  }

  /**
   * Performs a PUT request on the given path.
   */
  public async put(params: PutRequestParams): Promise<RequestReturn> {
    return this.request({ method: Method.Put, ...params });
  }

  /**
   * Performs a DELETE request on the given path.
   */
  public async delete(params: DeleteRequestParams): Promise<RequestReturn> {
    return this.request({ method: Method.Delete, ...params });
  }

  protected async request(params: RequestParams): Promise<RequestReturn> {
    const maxTries = params.tries ? params.tries : 1;
    if (maxTries <= 0) {
      throw new shop0Errors.HttpRequestError(
        `Number of tries must be >= 0, got ${maxTries}`
      );
    }

    let userAgent = `shop0 API Library v${shop0_API_LIBRARY_VERSION} | Node ${process.version}`;

    if (Context.USER_AGENT_PREFIX) {
      userAgent = `${Context.USER_AGENT_PREFIX} | ${userAgent}`;
    }

    if (params.extraHeaders) {
      if (params.extraHeaders["user-agent"]) {
        userAgent = `${params.extraHeaders["user-agent"]} | ${userAgent}`;
        delete params.extraHeaders["user-agent"];
      } else if (params.extraHeaders["User-Agent"]) {
        userAgent = `${params.extraHeaders["User-Agent"]} | ${userAgent}`;
      }
    }

    let headers: typeof params.extraHeaders = {
      ...params.extraHeaders,
      "User-Agent": userAgent,
    };
    let body = null;
    if (params.method === Method.Post || params.method === Method.Put) {
      const { type, data } = params as PostRequestParams;
      if (data) {
        switch (type) {
          case DataType.JSON:
            body = typeof data === "string" ? data : JSON.stringify(data);
            break;
          case DataType.URLEncoded:
            body =
              typeof data === "string"
                ? data
                : querystring.stringify(data as ParsedUrlQueryInput);
            break;
          case DataType.GraphQL:
            body = data as string;
            break;
        }
        headers = {
          "Content-Type": type,
          "Content-Length": Buffer.byteLength(body as string),
          ...params.extraHeaders,
        };
      }
    }

    const queryString = params.query
      ? `?${querystring.stringify(params.query as ParsedUrlQueryInput)}`
      : "";

    const url = `https://${this.domain}${params.path}${queryString}`;
    const options: RequestInit = {
      method: params.method.toString(),
      headers,
      body,
    } as RequestInit;

    async function sleep(waitTime: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    let tries = 0;
    while (tries < maxTries) {
      try {
        return await this.doRequest(url, options);
      } catch (error) {
        tries++;
        if (error instanceof shop0Errors.HttpRetriableError) {
          // We're not out of tries yet, use them
          if (tries < maxTries) {
            let waitTime = HttpClient.RETRY_WAIT_TIME;
            if (
              error instanceof shop0Errors.HttpThrottlingError &&
              error.retryAfter
            ) {
              waitTime = error.retryAfter * 1000;
            }
            await sleep(waitTime);
            continue;
          }

          // We're set to multiple tries but ran out
          if (maxTries > 1) {
            throw new shop0Errors.HttpMaxRetriesError(
              `Exceeded maximum retry count of ${maxTries}. Last message: ${error.message}`
            );
          }
        }

        // We're not retrying or the error is not retriable, rethrow
        throw error;
      }
    }

    // We're never supposed to come this far, this is here only for the benefit of Typescript
    /* istanbul ignore next */
    throw new shop0Errors.shop0Error(
      `Unexpected flow, reached maximum HTTP tries but did not throw an error`
    );
  }

  private async doRequest(
    url: string,
    options: RequestInit
  ): Promise<RequestReturn> {
    return fetch(url, options)
      .then(async (response: Response) => {
        const body = await response.json();

        if (response.ok) {
          if (
            response.headers &&
            response.headers.has("X-shop0-API-Deprecated-Reason")
          ) {
            const deprecation = {
              message: response.headers.get("X-shop0-API-Deprecated-Reason"),
              path: url,
            };

            const depHash = crypto
              .createHash("md5")
              .update(JSON.stringify(deprecation))
              .digest("hex");

            if (
              !Object.keys(this.LOGGED_DEPRECATIONS).includes(depHash) ||
              Date.now() - this.LOGGED_DEPRECATIONS[depHash] >=
                HttpClient.DEPRECATION_ALERT_DELAY
            ) {
              this.LOGGED_DEPRECATIONS[depHash] = Date.now();

              if (Context.LOG_FILE) {
                const stack = new Error().stack;
                const log = `API Deprecation Notice ${new Date().toLocaleString()} : ${JSON.stringify(
                  deprecation
                )}\n    Stack Trace: ${stack}\n`;
                fs.writeFileSync(Context.LOG_FILE, log, {
                  flag: "a",
                  encoding: "utf-8",
                });
              } else {
                console.warn("API Deprecation Notice:", deprecation);
              }
            }
          }

          return {
            body,
            headers: response.headers,
          };
        } else {
          const errorMessages: string[] = [];
          if (body.errors) {
            errorMessages.push(body.errors);
          }
          if (response.headers && response.headers.get("x-request-id")) {
            errorMessages.push(
              `If you report this error, please include this id: ${response.headers.get(
                "x-request-id"
              )}`
            );
          }

          const errorMessage = errorMessages.length
            ? `: ${errorMessages.join(". ")}`
            : "";
          switch (true) {
            case response.status === StatusCode.TooManyRequests: {
              const retryAfter = response.headers.get("Retry-After");
              throw new shop0Errors.HttpThrottlingError(
                `shop0 is throttling requests${errorMessage}`,
                retryAfter ? parseFloat(retryAfter) : undefined
              );
            }
            case response.status >= StatusCode.InternalServerError:
              throw new shop0Errors.HttpInternalError(
                `shop0 internal error${errorMessage}`
              );
            default:
              throw new shop0Errors.HttpResponseError(
                `Received an error response (${response.status} ${response.statusText}) from shop0${errorMessage}`,
                response.status,
                response.statusText
              );
          }
        }
      })
      .catch((error) => {
        if (error instanceof shop0Errors.shop0Error) {
          throw error;
        } else {
          throw new shop0Errors.HttpRequestError(
            `Failed to make shop0 HTTP request: ${error}`
          );
        }
      });
  }
}

export { HttpClient };
