import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/** Better Auth handler: sign-up/in/out, verification, reset, OAuth (M2). */
export const { POST, GET } = toNextJsHandler(auth);
