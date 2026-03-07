import * as z from "zod/mini";
import { ASSETS_BASE_URL } from "./constants";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = Omit<RequestInit, "method" | "body" | "headers"> & {
  headers?: HeadersInit;
};

function mergeHeaders(...parts: Array<HeadersInit | undefined>): Headers {
  const h = new Headers();
  for (const part of parts) {
    if (!part) continue;
    new Headers(part).forEach((value, key) => h.set(key, value));
  }
  return h;
}

function buildUrl(
  url: string,
  query?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!query) return url;

  const u = new URL(
    url,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined) continue;
    u.searchParams.set(k, String(v));
  }

  return url.startsWith("http://") || url.startsWith("https://")
    ? u.toString()
    : `${u.pathname}${u.search}`;
}

// Internal: request takes RequestInit (so body is allowed)
async function request<TRes>(args: {
  method: HttpMethod;
  url: string;
  responseSchema: z.core.$ZodType<TRes>;
  query?: Record<string, string | number | boolean | null | undefined>;
  init?: RequestInit;
}): Promise<TRes> {
  const finalUrl = buildUrl(args.url, args.query);

  const res = await fetch(finalUrl, {
    method: args.method,
    ...args.init,
    headers: mergeHeaders(args.init?.headers),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as TRes;

  const json = await res.json();
  return z.parse(args.responseSchema, json);
}

async function requestWithBody<TReq, TRes>(args: {
  method: Exclude<HttpMethod, "GET">;
  url: string;
  body: unknown;
  requestSchema: z.core.$ZodType<TReq>;
  responseSchema: z.core.$ZodType<TRes>;
  query?: Record<string, string | number | boolean | null | undefined>;
  init?: RequestOptions; // user-supplied, no body
}): Promise<TRes> {
  const parsedBody = z.parse(args.requestSchema, args.body);
  const finalUrl = buildUrl(args.url, args.query);

  const headers = mergeHeaders(args.init?.headers, { "Content-Type": "application/json" });

  return request<TRes>({
    method: args.method,
    url: finalUrl,
    responseSchema: args.responseSchema,
    init: {
      ...args.init,
      headers,
      body: JSON.stringify(parsedBody),
    },
  });
}

// Public helpers

export function getRequest<TRes>(args: {
  url: string;
  responseSchema: z.core.$ZodType<TRes>;
  query?: Record<string, string | number | boolean | null | undefined>;
  init?: RequestOptions;
}): Promise<TRes> {
  return request({
    method: "GET",
    url: args.url,
    query: args.query,
    responseSchema: args.responseSchema,
    init: args.init,
  });
}

export function postRequest<TReq, TRes>(args: {
  url: string;
  body: unknown;
  requestSchema: z.core.$ZodType<TReq>;
  responseSchema: z.core.$ZodType<TRes>;
  query?: Record<string, string | number | boolean | null | undefined>;
  init?: RequestOptions;
}): Promise<TRes> {
  return requestWithBody({
    method: "POST",
    url: args.url,
    body: args.body,
    requestSchema: args.requestSchema,
    responseSchema: args.responseSchema,
    query: args.query,
    init: args.init,
  });
}

export function putRequest<TReq, TRes>(args: {
  url: string;
  body: unknown;
  requestSchema: z.core.$ZodType<TReq>;
  responseSchema: z.core.$ZodType<TRes>;
  query?: Record<string, string | number | boolean | null | undefined>;
  init?: RequestOptions;
}): Promise<TRes> {
  return requestWithBody({
    method: "PUT",
    url: args.url,
    body: args.body,
    requestSchema: args.requestSchema,
    responseSchema: args.responseSchema,
    query: args.query,
    init: args.init,
  });
}

export function patchRequest<TReq, TRes>(args: {
  url: string;
  body: unknown;
  requestSchema: z.core.$ZodType<TReq>;
  responseSchema: z.core.$ZodType<TRes>;
  query?: Record<string, string | number | boolean | null | undefined>;
  init?: RequestOptions;
}): Promise<TRes> {
  return requestWithBody({
    method: "PATCH",
    url: args.url,
    body: args.body,
    requestSchema: args.requestSchema,
    responseSchema: args.responseSchema,
    query: args.query,
    init: args.init,
  });
}

export function deleteRequest<TRes>(args: {
  url: string;
  responseSchema: z.core.$ZodType<TRes>;
  query?: Record<string, string | number | boolean | null | undefined>;
  init?: RequestOptions;
}): Promise<TRes> {
  return request({
    method: "DELETE",
    url: args.url,
    query: args.query,
    responseSchema: args.responseSchema,
    init: args.init,
  });
}
