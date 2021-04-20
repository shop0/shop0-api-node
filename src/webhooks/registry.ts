import { createHmac } from "crypto";
import http from "http";

import { StatusCode } from "@shop0/network";

import { GraphqlClient } from "../clients/graphql/graphql_client";
import { ApiVersion, shop0Header } from "../base_types";
import shop0Utilities from "../utils";
import { Context } from "../context";
import * as shop0Errors from "../error";

import {
  DeliveryMethod,
  RegisterOptions,
  RegisterReturn,
  WebhookRegistryEntry,
  WebhookCheckResponse,
  WebhookCheckResponseLegacy,
} from "./types";

interface RegistryInterface {
  webhookRegistry: WebhookRegistryEntry[];

  /**
   * Registers a Webhook Handler function for a given topic.
   *
   * @param options Parameters to register a handler, including topic, listening address, handler function
   */
  register(options: RegisterOptions): Promise<RegisterReturn>;

  /**
   * Processes the webhook request received from the shop0 API
   *
   * @param request HTTP request received from shop0
   * @param response HTTP response to the request
   */
  process(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ): Promise<void>;

  /**
   * Confirms that the given path is a webhook path
   *
   * @param string path component of a URI
   */
  isWebhookPath(path: string): boolean;
}

function isSuccess(
  result: any,
  deliveryMethod: DeliveryMethod,
  webhookId?: string
): boolean {
  switch (deliveryMethod) {
    case DeliveryMethod.Http:
      if (webhookId) {
        return Boolean(
          result.data &&
            result.data.webhookSubscriptionUpdate &&
            result.data.webhookSubscriptionUpdate.webhookSubscription
        );
      } else {
        return Boolean(
          result.data &&
            result.data.webhookSubscriptionCreate &&
            result.data.webhookSubscriptionCreate.webhookSubscription
        );
      }
    case DeliveryMethod.EventBridge:
      if (webhookId) {
        return Boolean(
          result.data &&
            result.data.eventBridgeWebhookSubscriptionUpdate &&
            result.data.eventBridgeWebhookSubscriptionUpdate.webhookSubscription
        );
      } else {
        return Boolean(
          result.data &&
            result.data.eventBridgeWebhookSubscriptionCreate &&
            result.data.eventBridgeWebhookSubscriptionCreate.webhookSubscription
        );
      }
    default:
      return false;
  }
}

// 2020-07 onwards
function versionSupportsEndpointField() {
  return shop0Utilities.versionCompatible(ApiVersion.July20);
}

function validateDeliveryMethod(deliveryMethod: DeliveryMethod) {
  if (
    deliveryMethod === DeliveryMethod.EventBridge &&
    !versionSupportsEndpointField()
  ) {
    throw new shop0Errors.UnsupportedClientType(
      `EventBridge webhooks are not supported in API version "${Context.API_VERSION}".`
    );
  }
}

function buildCheckQuery(topic: string): string {
  const query = `{
    webhookSubscriptions(first: 1, topics: ${topic}) {
      edges {
        node {
          id
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
            ... on WebhookEventBridgeEndpoint {
              arn
            }
          }
        }
      }
    }
  }`;

  const legacyQuery = `{
    webhookSubscriptions(first: 1, topics: ${topic}) {
      edges {
        node {
          id
          callbackUrl
        }
      }
    }
  }`;

  return versionSupportsEndpointField() ? query : legacyQuery;
}

function buildQuery(
  topic: string,
  address: string,
  deliveryMethod: DeliveryMethod = DeliveryMethod.Http,
  webhookId?: string
): string {
  validateDeliveryMethod(deliveryMethod);
  let identifier: string;
  if (webhookId) {
    identifier = `id: "${webhookId}"`;
  } else {
    identifier = `topic: ${topic}`;
  }

  let mutationName: string;
  let webhookSubscriptionArgs: string;
  switch (deliveryMethod) {
    case DeliveryMethod.Http:
      mutationName = webhookId
        ? "webhookSubscriptionUpdate"
        : "webhookSubscriptionCreate";
      webhookSubscriptionArgs = `{callbackUrl: "${address}"}`;
      break;
    case DeliveryMethod.EventBridge:
      mutationName = webhookId
        ? "eventBridgeWebhookSubscriptionUpdate"
        : "eventBridgeWebhookSubscriptionCreate";
      webhookSubscriptionArgs = `{arn: "${address}"}`;
      break;
  }

  return `
    mutation webhookSubscription {
      ${mutationName}(${identifier}, webhookSubscription: ${webhookSubscriptionArgs}) {
        userErrors {
          field
          message
        }
        webhookSubscription {
          id
        }
      }
    }
  `;
}

const WebhooksRegistry: RegistryInterface = {
  webhookRegistry: [],

  async register({
    path,
    topic,
    accessToken,
    shop,
    deliveryMethod = DeliveryMethod.Http,
    webhookHandler,
  }: RegisterOptions): Promise<RegisterReturn> {
    validateDeliveryMethod(deliveryMethod);
    const client = new GraphqlClient(shop, accessToken);
    const address =
      deliveryMethod === DeliveryMethod.EventBridge
        ? path
        : `https://${Context.HOST_NAME}${path}`;
    const checkResult = (await client.query({
      data: buildCheckQuery(topic),
    })) as { body: WebhookCheckResponse | WebhookCheckResponseLegacy };
    let webhookId: string | undefined;
    let mustRegister = true;
    if (checkResult.body.data.webhookSubscriptions.edges.length) {
      const { node } = checkResult.body.data.webhookSubscriptions.edges[0];
      let endpointAddress = "";
      if ("endpoint" in node) {
        endpointAddress =
          node.endpoint.__typename === "WebhookHttpEndpoint"
            ? node.endpoint.callbackUrl
            : node.endpoint.arn;
      } else {
        endpointAddress = node.callbackUrl;
      }
      webhookId = node.id;
      if (endpointAddress === address) {
        mustRegister = false;
      }
    }

    let success: boolean;
    let body: unknown;
    if (mustRegister) {
      const result = await client.query({
        data: buildQuery(topic, address, deliveryMethod, webhookId),
      });

      success = isSuccess(result.body, deliveryMethod, webhookId);
      body = result.body;
    } else {
      success = true;
      body = {};
    }

    if (success) {
      // Remove this topic from the registry if it is already there
      WebhooksRegistry.webhookRegistry = WebhooksRegistry.webhookRegistry.filter(
        (item) => item.topic !== topic
      );
      WebhooksRegistry.webhookRegistry.push({ path, topic, webhookHandler });
    }

    return { success, result: body };
  },

  async process(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ): Promise<void> {
    let reqBody = "";

    const promise: Promise<void> = new Promise((resolve, reject) => {
      request.on("data", (chunk) => {
        reqBody += chunk;
      });

      request.on("end", async () => {
        if (!reqBody.length) {
          response.writeHead(StatusCode.BadRequest);
          response.end();
          return reject(
            new shop0Errors.InvalidWebhookError(
              "No body was received when processing webhook"
            )
          );
        }

        let hmac: string | string[] | undefined;
        let topic: string | string[] | undefined;
        let domain: string | string[] | undefined;
        Object.entries(request.headers).map(([header, value]) => {
          switch (header.toLowerCase()) {
            case shop0Header.Hmac.toLowerCase():
              hmac = value;
              break;
            case shop0Header.Topic.toLowerCase():
              topic = value;
              break;
            case shop0Header.Domain.toLowerCase():
              domain = value;
              break;
          }
        });

        const missingHeaders = [];
        if (!hmac) {
          missingHeaders.push(shop0Header.Hmac);
        }
        if (!topic) {
          missingHeaders.push(shop0Header.Topic);
        }
        if (!domain) {
          missingHeaders.push(shop0Header.Domain);
        }

        if (missingHeaders.length) {
          response.writeHead(StatusCode.BadRequest);
          response.end();
          return reject(
            new shop0Errors.InvalidWebhookError(
              `Missing one or more of the required HTTP headers to process webhooks: [${missingHeaders.join(
                ", "
              )}]`
            )
          );
        }

        let statusCode: StatusCode | undefined;
        let responseError: Error | undefined;
        const headers = {};

        const generatedHash = createHmac("sha256", Context.API_SECRET_KEY)
          .update(reqBody, "utf8")
          .digest("base64");

        if (shop0Utilities.safeCompare(generatedHash, hmac as string)) {
          const graphqlTopic = (topic as string)
            .toUpperCase()
            .replace(/\//g, "_");
          const webhookEntry = WebhooksRegistry.webhookRegistry.find(
            (entry) => entry.topic === graphqlTopic
          );

          if (webhookEntry) {
            try {
              await webhookEntry.webhookHandler(
                graphqlTopic,
                domain as string,
                reqBody
              );
              statusCode = StatusCode.Ok;
            } catch (error) {
              statusCode = StatusCode.InternalServerError;
              responseError = error;
            }
          } else {
            statusCode = StatusCode.Forbidden;
            responseError = new shop0Errors.InvalidWebhookError(
              `No webhook is registered for topic ${topic}`
            );
          }
        } else {
          statusCode = StatusCode.Forbidden;
          responseError = new shop0Errors.InvalidWebhookError(
            `Could not validate request for topic ${topic}`
          );
        }

        response.writeHead(statusCode, headers);
        response.end();
        if (responseError) {
          return reject(responseError);
        } else {
          return resolve();
        }
      });
    });

    return promise;
  },

  isWebhookPath(path: string): boolean {
    return Boolean(
      WebhooksRegistry.webhookRegistry.find((entry) => entry.path === path)
    );
  },
};

export { WebhooksRegistry, RegistryInterface, buildCheckQuery, buildQuery };
