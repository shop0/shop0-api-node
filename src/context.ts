import * as shop0Errors from "./error";
import { SessionStorage, MemorySessionStorage } from "./auth/session";
import { ApiVersion, ContextParams } from "./base_types";
import { AuthScopes } from "./auth/scopes";

interface ContextInterface extends ContextParams {
  SESSION_STORAGE: SessionStorage;
  SCOPES: AuthScopes;

  /**
   * Sets up the shop0 API Library to be able to integrate with shop0 and run authenticated commands.
   *
   * @param params Settings to update
   */
  initialize(params: ContextParams): void;

  /**
   * Throws error if context has not been initialized.
   */
  throwIfUninitialized(): void | never;

  /**
   * Throws error if the current app is private.
   */
  throwIfPrivateApp(message: string): void | never;
}

const Context: ContextInterface = {
  API_KEY: "",
  API_SECRET_KEY: "",
  SCOPES: new AuthScopes([]),
  HOST_NAME: "",
  API_VERSION: ApiVersion.Unstable,
  IS_EMBEDDED_APP: true,
  IS_PRIVATE_APP: false,
  SESSION_STORAGE: new MemorySessionStorage(),

  initialize(params: ContextParams): void {
    let scopes: AuthScopes;
    if (params.SCOPES instanceof AuthScopes) {
      scopes = params.SCOPES;
    } else {
      scopes = new AuthScopes(params.SCOPES);
    }

    // Make sure that the essential params actually have content in them
    const missing: string[] = [];
    if (!params.API_KEY.length) {
      missing.push("API_KEY");
    }
    if (!params.API_SECRET_KEY.length) {
      missing.push("API_SECRET_KEY");
    }
    if (!scopes.toArray().length) {
      missing.push("SCOPES");
    }
    if (!params.HOST_NAME.length) {
      missing.push("HOST_NAME");
    }

    if (missing.length) {
      throw new shop0Errors.shop0Error(
        `Cannot initialize shop0 API Library. Missing values for: ${missing.join(
          ", "
        )}`
      );
    }

    this.API_KEY = params.API_KEY;
    this.API_SECRET_KEY = params.API_SECRET_KEY;
    this.SCOPES = scopes;
    this.HOST_NAME = params.HOST_NAME;
    this.API_VERSION = params.API_VERSION;
    this.IS_EMBEDDED_APP = params.IS_EMBEDDED_APP;
    this.IS_PRIVATE_APP = params.IS_PRIVATE_APP;

    if (params.SESSION_STORAGE) {
      this.SESSION_STORAGE = params.SESSION_STORAGE;
    }

    if (params.USER_AGENT_PREFIX) {
      this.USER_AGENT_PREFIX = params.USER_AGENT_PREFIX;
    }

    if (params.LOG_FILE) {
      this.LOG_FILE = params.LOG_FILE;
    }
  },

  throwIfUninitialized(): void {
    if (!this.API_KEY || this.API_KEY.length === 0) {
      throw new shop0Errors.UninitializedContextError(
        "Context has not been properly initialized. Please call the .initialize() method to setup your app context object."
      );
    }
  },

  throwIfPrivateApp(message: string): void {
    if (Context.IS_PRIVATE_APP) {
      throw new shop0Errors.PrivateAppError(message);
    }
  },
};

export { Context, ContextInterface };
