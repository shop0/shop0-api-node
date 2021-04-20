class shop0Error extends Error {
  constructor(...args: any) {
    super(...args);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class InvalidHmacError extends shop0Error {}
class InvalidShopError extends shop0Error {}
class InvalidJwtError extends shop0Error {}
class MissingJwtTokenError extends shop0Error {}

class SafeCompareError extends shop0Error {}
class UninitializedContextError extends shop0Error {}
class PrivateAppError extends shop0Error {}

class HttpRequestError extends shop0Error {}
class HttpMaxRetriesError extends shop0Error {}
class HttpResponseError extends shop0Error {
  public constructor(
    message: string,
    readonly code: number,
    readonly statusText: string
  ) {
    super(message);
  }
}
class HttpRetriableError extends shop0Error {}
class HttpInternalError extends HttpRetriableError {}
class HttpThrottlingError extends HttpRetriableError {
  public constructor(message: string, readonly retryAfter?: number) {
    super(message);
  }
}

class InvalidOAuthError extends shop0Error {}
class SessionNotFound extends shop0Error {}
class CookieNotFound extends shop0Error {}
class InvalidSession extends shop0Error {}

class InvalidWebhookError extends shop0Error {}
class SessionStorageError extends shop0Error {}

class MissingRequiredArgument extends shop0Error {}
class UnsupportedClientType extends shop0Error {}

export {
  shop0Error,
  InvalidHmacError,
  InvalidShopError,
  InvalidJwtError,
  MissingJwtTokenError,
  SafeCompareError,
  HttpRequestError,
  HttpMaxRetriesError,
  HttpResponseError,
  HttpRetriableError,
  HttpInternalError,
  HttpThrottlingError,
  UninitializedContextError,
  InvalidOAuthError,
  SessionNotFound,
  CookieNotFound,
  InvalidSession,
  InvalidWebhookError,
  MissingRequiredArgument,
  UnsupportedClientType,
  SessionStorageError,
  PrivateAppError,
};
