/** HTTP History commands: search, recent, get, get-response, export-curl */

import { getClient, SECRETS_PATH } from "../client";
import { decodeRaw, formatHttpRaw, rawToCurl } from "../output";
import type { OutputOpts } from "../types";
import { existsSync, readFileSync } from "fs";

/** Read the cached access token for direct GraphQL calls (bypasses SDK builder) */
function getCachedToken(): string {
  try {
    if (existsSync(SECRETS_PATH)) {
      const secrets = JSON.parse(readFileSync(SECRETS_PATH, "utf-8"));
      return secrets.caido?.cachedToken?.accessToken ?? "";
    }
  } catch {}
  return "";
}

/** Direct GraphQL fetch — bypasses the SDK list().filter() builder which uses
 *  the old HTTPQL variable type incompatible with Caido v0.56+ (now HTTPQLInput). */
async function graphqlFetch(query: string): Promise<any> {
  const token = getCachedToken();
  const resp = await fetch("http://127.0.0.1:8080/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query }),
  });
  const data = await resp.json() as any;
  if (data.errors?.length) {
    throw new Error(`[GraphQL] ${data.errors.map((e: any) => e.message).join("; ")}`);
  }
  return data.data;
}

export async function cmdSearch(filter: string, limit: number, after?: string, idsOnly?: boolean) {
  const afterClause = after ? `, after: "${after}"` : "";
  const filterClause = filter ? `, filter: {code: ${JSON.stringify(filter)}}` : "";
  const query = `{ requests(first: ${limit}${afterClause}${filterClause}) { edges { cursor node { id method host path query isTls port createdAt response { statusCode roundtripTime length } } } pageInfo { hasNextPage endCursor } } }`;

  const data = await graphqlFetch(query);
  const connection = data.requests;

  if (idsOnly) {
    const ids = connection.edges.map((e: any) => e.node.id);
    console.log(JSON.stringify(ids));
    return;
  }

  const results = connection.edges.map((e: any) => ({
    id: e.node.id,
    method: e.node.method,
    host: e.node.host,
    path: e.node.path,
    query: e.node.query || undefined,
    isTls: e.node.isTls,
    port: e.node.port,
    statusCode: e.node.response?.statusCode,
    roundtrip: e.node.response?.roundtripTime,
    responseLength: e.node.response?.length,
    createdAt: e.node.createdAt,
    cursor: e.cursor,
  }));

  console.log(JSON.stringify({
    results,
    pageInfo: connection.pageInfo,
    count: results.length,
  }, null, 2));
}

export async function cmdRecent(limit: number) {
  const query = `{ requests(first: ${limit}, order: {orderBy: ID, orderDirection: DESC}) { edges { node { id method host path response { statusCode roundtripTime } createdAt } } } }`;

  let data: any;
  try {
    data = await graphqlFetch(query);
  } catch {
    // Fallback: try without order clause if server doesn't support it
    const fallback = `{ requests(first: ${limit}) { edges { node { id method host path response { statusCode roundtripTime } createdAt } } } }`;
    data = await graphqlFetch(fallback);
  }

  const results = data.requests.edges.map((e: any) => ({
    id: e.node.id,
    method: e.node.method,
    host: e.node.host,
    path: e.node.path,
    statusCode: e.node.response?.statusCode,
    roundtrip: e.node.response?.roundtripTime,
    createdAt: e.node.createdAt,
  }));

  console.log(JSON.stringify({ results, count: results.length }, null, 2));
}

export async function cmdGet(requestId: string, opts: OutputOpts) {
  const client = await getClient();
  const result = await client.request.get(requestId, { raw: true });

  if (!result) {
    console.error(`Request ${requestId} not found`);
    process.exit(1);
  }

  const output: Record<string, any> = {
    id: result.request.id,
    method: result.request.method,
    host: result.request.host,
    path: result.request.path,
    port: result.request.port,
    isTls: result.request.isTls,
    createdAt: result.request.createdAt,
  };

  if (!opts.noRequest && result.request.raw) {
    output.raw = formatHttpRaw(decodeRaw(result.request.raw), opts);
  }

  if (result.response) {
    output.response = {
      statusCode: result.response.statusCode,
      roundtrip: result.response.roundtripTime,
      length: result.response.length,
    };
    if (result.response.raw) {
      output.response.raw = formatHttpRaw(decodeRaw(result.response.raw), opts);
    }
  }

  console.log(JSON.stringify(output, null, 2));
}

export async function cmdGetResponse(requestId: string, opts: OutputOpts) {
  const client = await getClient();
  const result = await client.request.get(requestId, {
    requestRaw: false,
    responseRaw: true,
  });

  if (!result) {
    console.error(`Request ${requestId} not found`);
    process.exit(1);
  }

  if (!result.response) {
    console.log(JSON.stringify({ error: "No response for this request" }));
    return;
  }

  const output: Record<string, any> = {
    statusCode: result.response.statusCode,
    roundtrip: result.response.roundtripTime,
    length: result.response.length,
  };

  if (result.response.raw) {
    output.raw = formatHttpRaw(decodeRaw(result.response.raw), opts);
  }

  console.log(JSON.stringify(output, null, 2));
}

export async function cmdExportCurl(requestId: string) {
  const client = await getClient();
  const result = await client.request.get(requestId, { raw: true });

  if (!result) {
    console.error(`Request ${requestId} not found`);
    process.exit(1);
  }

  const raw = decodeRaw(result.request.raw);
  if (!raw) {
    console.error("No raw data for this request");
    process.exit(1);
  }

  const curl = rawToCurl(raw, result.request.host, result.request.port, result.request.isTls);
  console.log(curl);
}
