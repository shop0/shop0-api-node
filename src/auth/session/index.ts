import { Session } from "./session";
import { SessionStorage } from "./session_storage";
import { MemorySessionStorage } from "./storage/memory";
import { CustomSessionStorage } from "./storage/custom";

const shop0Session = {
  Session,
  MemorySessionStorage,
  CustomSessionStorage,
};

export default shop0Session;
export { Session, SessionStorage, MemorySessionStorage, CustomSessionStorage };
