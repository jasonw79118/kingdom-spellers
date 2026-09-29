// Unified backend interface.
//
// Exposes a single `backend` object whose methods are async and identical
// across every storage option. Components import { backend } from here and
// never touch a storage SDK directly.
//
// Priority: Appwrite → Supabase → local demo mode.
//
// SDKs are loaded lazily so a project only ever downloads the backend it
// actually uses (Appwrite-only builds never pull in the Supabase client).

import { isSupabaseConfigured, initSupabase } from "./supabase.js";
import { isAppwriteConfigured } from "./appwrite.js";
import { localBackend } from "./localBackend.js";

export const backendMode = isAppwriteConfigured
  ? "appwrite"
  : isSupabaseConfigured
    ? "supabase"
    : "demo";

async function resolveBackend() {
  if (isAppwriteConfigured) {
    const { createAppwriteBackend } = await import("./appwriteBackend.js");
    return createAppwriteBackend();
  }
  if (isSupabaseConfigured) {
    const supabase = await initSupabase();
    const { createSupabaseBackend } = await import("./supabaseBackend.js");
    return createSupabaseBackend(supabase);
  }
  return localBackend;
}

// A proxy so `backend` can be imported synchronously (as React refs and
// effects require) while the real backend resolves on first use.
let resolved = null;
let resolving = null;

function ready() {
  if (resolved) return Promise.resolve(resolved);
  if (!resolving) {
    resolving = resolveBackend().then((b) => {
      resolved = b;
      return b;
    });
  }
  return resolving;
}

// Methods are all async, so every call can simply await the backend.
// The proxy is recursive so nested access like `backend.auth.getCurrentUser()`
// and `backend.lists.createDefaultFor(player)` both work.
function makeProxy() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        // Let non-backend members (e.g. Symbol.toPrimitive) pass through.
        if (typeof prop === "symbol") return undefined;
        return new Proxy(
          function () {},
          {
            get(_fn, innerProp) {
              if (typeof innerProp === "symbol") return undefined;
              return async (...args) => {
                const b = await ready();
                const group = b[prop];
                if (!group) {
                  throw new Error(`backend.${String(prop)} is not available`);
                }
                const fn = group[innerProp];
                if (typeof fn !== "function") {
                  throw new Error(`backend.${String(prop)}.${String(innerProp)} is not a function`);
                }
                return fn.apply(group, args);
              };
            },
            apply(_fn, _thisArg, args) {
              // Support `backend.auth(...)` style calls too.
              return (async () => {
                const b = await ready();
                const group = b[prop];
                return typeof group === "function" ? group(...args) : group;
              })();
            },
          }
        );
      },
    }
  );
}

export const backend = makeProxy();

// Pre-warm the backend so the first render isn't waiting on a module load.
ready();

export { isAppwriteConfigured, isSupabaseConfigured };
