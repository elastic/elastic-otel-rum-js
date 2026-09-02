/** @type {import('@opentelemetry/api').ContextManager} */
export const AsyncApisContextManager: import("@opentelemetry/api").ContextManager;
export type FunctionKeys<T> = { [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never; }[keyof T];
