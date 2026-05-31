import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  actor?: string;
  userId?: string;
  hospitalId?: string;
  consentVersion?: string;
  purpose?: string;
  retentionPolicy?: string;
  ipAddress?: string;
  userAgent?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runWithRequestContext = <T>(context: RequestContext, callback: () => T): T => {
  return requestContextStorage.run(context, callback);
};

export const getRequestContext = (): RequestContext | undefined => {
  return requestContextStorage.getStore();
};

export const mergeRequestContext = (patch: Partial<RequestContext>): void => {
  const context = requestContextStorage.getStore();
  if (!context) {
    return;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (context as Record<string, unknown>)[key] = value;
    }
  }
};
