/** @type {import('@opentelemetry/api').ContextManager} */
export const AsyncApisContextManager: import("@opentelemetry/api").ContextManager;
export type AnyFunction = (...args: any[]) => any;
export type FunctionKeys<T> = { [K in keyof T]: T[K] extends ((...args: any[]) => any) | undefined ? K : never; }[keyof T];
