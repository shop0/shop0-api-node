import "../../test/test_helper";

import http from "http";

import jwt from "jsonwebtoken";
import Cookies from "cookies";

import { Context } from "../../context";
import * as shop0Errors from "../../error";
import { Session } from "../../auth/session";
import { JwtPayload } from "../decode-session-token";
import loadCurrentSession from "../load-current-session";
import { shop0OAuth } from "../../auth/oauth/oauth";

jest.mock("cookies");

describe("loadCurrentSession", () => {
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

  it("gets the current session from cookies for non-embedded apps", async () => {
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

    await expect(loadCurrentSession(req, res)).resolves.toEqual(session);
  });

  it("loads nothing if there is no session for non-embedded apps", async () => {
    Context.IS_EMBEDDED_APP = false;
    Context.initialize(Context);

    const req = {} as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    Cookies.prototype.get.mockImplementation(() => null);

    await expect(loadCurrentSession(req, res)).resolves.toBeUndefined();
  });

  it("gets the current session from JWT token for embedded apps", async () => {
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

    await expect(loadCurrentSession(req, res)).resolves.toEqual(session);
  });

  it("loads nothing if no authorization header is present", async () => {
    Context.IS_EMBEDDED_APP = true;
    Context.initialize(Context);

    const req = { headers: {} } as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    await expect(loadCurrentSession(req, res)).resolves.toBeUndefined();
  });

  it("loads nothing if there is no session for embedded apps", async () => {
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

    await expect(loadCurrentSession(req, res)).resolves.toBeUndefined();
  });

  it("fails if authorization header is missing or is not a Bearer token", async () => {
    Context.IS_EMBEDDED_APP = true;
    Context.initialize(Context);

    const req = {
      headers: {
        authorization: "Not a Bearer token!",
      },
    } as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    await expect(() => loadCurrentSession(req, res)).rejects.toBeInstanceOf(
      shop0Errors.MissingJwtTokenError
    );
  });

  it("falls back to the cookie session for embedded apps", async () => {
    Context.IS_EMBEDDED_APP = true;
    Context.initialize(Context);

    const req = {
      headers: {
        authorization: "",
      },
    } as http.IncomingMessage;
    const res = {} as http.ServerResponse;

    const cookieId = "1234-this-is-a-cookie-session-id";

    const session = new Session(cookieId);
    await expect(
      Context.SESSION_STORAGE.storeSession(session)
    ).resolves.toEqual(true);

    Cookies.prototype.get.mockImplementation(() => cookieId);

    await expect(loadCurrentSession(req, res)).resolves.toEqual(session);
  });

  it("loads offline sessions from cookies", async () => {
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

    await expect(loadCurrentSession(req, res, false)).resolves.toEqual(session);
  });

  it("loads offline sessions from JWT token", async () => {
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

    await expect(loadCurrentSession(req, res, false)).resolves.toEqual(session);
  });
});
