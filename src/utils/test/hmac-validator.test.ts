import crypto from "crypto";

import validateHmac from "../hmac-validator";
import { AuthQuery } from "../../auth/oauth/types";
import * as shop0Errors from "../../error";
import { Context } from "../../context";

test("correctly validates query objects", () => {
  Context.API_SECRET_KEY = "my super secret key";
  const queryString =
    "code=some%20code%20goes%20here&shop=the%20shop%20URL&state=some%20nonce%20passed%20from%20auth&timestamp=a%20number%20as%20a%20string";
  const queryObjectWithoutHmac = {
    code: "some code goes here",
    shop: "the shop URL",
    state: "some nonce passed from auth",
    timestamp: "a number as a string",
  };
  const localHmac = crypto
    .createHmac("sha256", Context.API_SECRET_KEY)
    .update(queryString)
    .digest("hex");

  const testQuery: AuthQuery = Object.assign(queryObjectWithoutHmac, {
    hmac: localHmac,
  });

  const badQuery: AuthQuery = {
    code: "some code goes here",
    hmac: "incorrect_hmac_string",
    timestamp: "a number as a string",
    state: "some nonce passed from auth",
    shop: "the shop URL",
  };

  expect(validateHmac(testQuery)).toBe(true);
  expect(validateHmac(badQuery)).toBe(false);
});

test("queries without hmac key throw InvalidHmacError", () => {
  const noHmacQuery = {
    code: "some code goes here",
    timestamp: "a number as a string",
    state: "some nonce passed from auth",
    shop: "the shop URL",
  };

  expect(() => {
    validateHmac(noHmacQuery);
  }).toThrowError(shop0Errors.InvalidHmacError);
});
