import "../../test/test_helper";

import http from "http";

import jwt from "jsonwebtoken";
import Cookies from "cookies";

import { Context } from "../../context";
import * as shop0Errors from "../../error";
import { Session } from "../../auth/session";
import { JwtPayload } from "../decode-session-token";
import deleteCurrentSession from "../delete-current-session";
import loadCurrentSession from "../load-current-session";
import { shop0OAuth } from "../../auth/oauth/oauth";

jest.mock("cookies");

describe("deleteCurrenSession", () => {
  let jwtPayload: JwtPayload;
  beforeEach(() => {
    jwtPayload = {
      iss: "https://test-shop.myshop0.io/admin",
      dest: "https://test-shop.myshop0.io",
      aud: Context.API_KEY,
      sub: "1",
      exp: Date.now() / 1000 + 3600,
      nbf: 1234,
      iat: 1234,
      jti: "4321",
      sid: "abc123",
    };
  });

  it("finds and deletes the current session when using cookies", async () => {
    Context.IS_EMBEDDED_APP = false;
    Context.initialize(Context);

    const req = {} as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    const cookieId = "1234-this-is-a-cookie-session-id";

    const session = new Session(cookieId);
    await expect(
      Context.SESSION_STORAGE.storeSession(session)
    ).resolves.toEqual(true);

    Cookies.prototype.get.mockImplementation(() => cookieId);

    await expect(deleteCurrentSession(req, res)).resolves.toBe(true);
    await expect(loadCurrentSession(req, res)).resolves.toBe(undefined);
  });

  it("finds and deletes the current session when using JWT", async () => {
    Context.IS_EMBEDDED_APP = true;
    Context.initialize(Context);

    const token = jwt.sign(jwtPayload, Context.API_SECRET_KEY, {
      algorithm: "HS256",
    });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    const session = new Session(`test-shop.myshop0.io_${jwtPayload.sub}`);
    await expect(
      Context.SESSION_STORAGE.storeSession(session)
    ).resolves.toEqual(true);

    await expect(deleteCurrentSession(req, res)).resolves.toBe(true);
    await expect(loadCurrentSession(req, res)).resolves.toBe(undefined);
  });

  it("finds and deletes the current offline session when using cookies", async () => {
    Context.IS_EMBEDDED_APP = false;
    Context.initialize(Context);

    const req = {} as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    const cookieId = shop0OAuth.getOfflineSessionId("test-shop.myshop0.io");

    const session = new Session(cookieId);
    await expect(
      Context.SESSION_STORAGE.storeSession(session)
    ).resolves.toEqual(true);

    Cookies.prototype.get.mockImplementation(() => cookieId);

    await expect(deleteCurrentSession(req, res, false)).resolves.toBe(true);
    await expect(loadCurrentSession(req, res, false)).resolves.toBe(undefined);
  });

  it("finds and deletes the current offline session when using JWT", async () => {
    Context.IS_EMBEDDED_APP = true;
    Context.initialize(Context);

    const token = jwt.sign(jwtPayload, Context.API_SECRET_KEY, {
      algorithm: "HS256",
    });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    const session = new Session(
      shop0OAuth.getOfflineSessionId("test-shop.myshop0.io")
    );
    await expect(
      Context.SESSION_STORAGE.storeSession(session)
    ).resolves.toEqual(true);

    await expect(deleteCurrentSession(req, res, false)).resolves.toBe(true);
    await expect(loadCurrentSession(req, res, false)).resolves.toBe(undefined);
  });

  it("throws an error when no cookie is found", async () => {
    Context.IS_EMBEDDED_APP = false;
    Context.initialize(Context);

    const req = {} as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    Cookies.prototype.get.mockImplementation(() => null);

    await expect(() => deleteCurrentSession(req, res)).rejects.toBeInstanceOf(
      shop0Errors.SessionNotFound
    );
  });

  it("throws an error when authorization header is not a bearer token", async () => {
    Context.IS_EMBEDDED_APP = true;
    Context.initialize(Context);

    const req = {
      headers: {
        authorization: "What's a bearer token?",
      },
    } as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    await expect(() => deleteCurrentSession(req, res)).rejects.toBeInstanceOf(
      shop0Errors.MissingJwtTokenError
    );
  });
});
