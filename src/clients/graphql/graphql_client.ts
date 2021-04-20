import { MissingRequiredArgument } from "../../error";
import { Context } from "../../context";
import { shop0Header } from "../../base_types";
import { HttpClient } from "../http_client/http_client";
import { DataType, RequestReturn } from "../http_client/types";
import * as shop0Errors from "../../error";

import { GraphqlParams } from "./types";

export class GraphqlClient {
  private readonly client: HttpClient;

  constructor(readonly domain: string, readonly token?: string) {
    if (!Context.IS_PRIVATE_APP && !token) {
      throw new shop0Errors.MissingRequiredArgument(
        "Missing access token when creating GraphQL client"
      );
    }

    this.client = new HttpClient(this.domain);
  }

  async query(params: GraphqlParams): Promise<RequestReturn> {
    if (params.data.length === 0) {
      throw new MissingRequiredArgument("Query missing.");
    }

    params.extraHeaders = {
      [shop0Header.AccessToken]: Context.IS_PRIVATE_APP
        ? Context.API_SECRET_KEY
        : (this.token as string),
      ...params.extraHeaders,
    };
    const path = `/admin/api/${Context.API_VERSION}/graphql.json`;

    let dataType: DataType.GraphQL | DataType.JSON;

    if (typeof params.data === "object") {
      dataType = DataType.JSON;
    } else {
      dataType = DataType.GraphQL;
    }

    return this.client.post({ path, type: dataType, ...params });
  }
}
