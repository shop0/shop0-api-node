import crypto from "crypto";
import querystring from "querystring";

import { AuthQuery } from "../auth/oauth/types";
import * as shop0Errors from "../error";
import { Context } from "../context";

import safeCompare from "./safe-compare";

export function stringifyQuery(query: AuthQuery): string {
  const orderedObj = Object.keys(query)
    .sort((val1, val2) => val1.localeCompare(val2))
    .reduce((obj: Record<string, string | undefined>, key: keyof AuthQuery) => {
      obj[key] = query[key];
      return obj;
    }, {});
  return querystring.stringify(orderedObj);
}

export function generateLocalHmac(query: AuthQuery): string {
  const queryString = stringifyQuery(query);
  return crypto
    .createHmac("sha256", Context.API_SECRET_KEY)
    .update(queryString)
    .digest("hex");
}

/**
 * Uses the received query to validate the contained hmac value against the rest of the query content.
 *
 * @param query HTTP Request Query, containing the information to be validated.
 */
export default function validateHmac(query: AuthQuery): boolean {
  if (!query.hmac) {
    throw new shop0Errors.InvalidHmacError(
      "Query does not contain an HMAC value."
    );
  }
  const { hmac, ...rest } = query;
  const localHmac = generateLocalHmac(rest);

  return safeCompare(hmac as string, localHmac);
}
