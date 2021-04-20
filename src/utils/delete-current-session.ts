import http from "http";

import { Context } from "../context";
import { shop0OAuth } from "../auth/oauth/oauth";
import * as shop0Errors from "../error";

/**
 * Finds and deletes the current user's session, based on the given request and response
 *
 * @param request  Current HTTP request
 * @param response Current HTTP response
 * @param isOnline Whether to load online (default) or offline sessions (optional)
 */
export default async function deleteCurrentSession(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  isOnline = true
): Promise<boolean | never> {
  Context.throwIfUninitialized();

  const sessionId = shop0OAuth.getCurrentSessionId(request, response, isOnline);
  if (!sessionId) {
    throw new shop0Errors.SessionNotFound("No active session found.");
  }

  return Context.SESSION_STORAGE.deleteSession(sessionId);
}
