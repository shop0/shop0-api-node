import "../../test/test_helper";

import http from "http";

import jwt from "jsonwebtoken";

import { Session } from "../../auth/session";
import { Context } from "../../context";
import loadCurrentSession from "../load-current-session";
import storeSession from "../store-session";

describe("storeSession", () => {
  it("can store the current session after a change", async () => {
    const jwtPayload = {
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
    await storeSession(session);

    let loadedSession = await loadCurrentSession(req, res);
    expect(loadedSession).toEqual(session);

    session.state = "new_state";
    await storeSession(session);

    loadedSession = await loadCurrentSession(req, res);
    expect(loadedSession).toEqual(session);
  });
});
