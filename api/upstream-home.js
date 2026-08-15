const FIREBASE_API_KEY = "AIzaSyCizsvBzR6vDVQQ1fp_H8pEB6XjJ1T5qjY";
const UPSTREAM_HOME_URL =
  "https://firestore.googleapis.com/v1/projects/aoe4-guides/databases/(default)/documents/home/home" +
  `?key=${FIREBASE_API_KEY}`;

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [
        key,
        decodeFirestoreValue(item),
      ])
    );
  }
  return null;
}

export function decodeFirestoreDocument(document) {
  return Object.fromEntries(
    Object.entries(document?.fields ?? {}).map(([key, value]) => [
      key,
      decodeFirestoreValue(value),
    ])
  );
}

export async function proxyUpstreamHome(
  appCheckToken,
  fetchImpl = fetch
) {
  const upstream = await fetchImpl(UPSTREAM_HOME_URL, {
    headers: { "X-Firebase-AppCheck": appCheckToken },
  });
  if (!upstream.ok) return null;
  return decodeFirestoreDocument(await upstream.json());
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const appCheckToken = process.env.UPSTREAM_FIREBASE_APP_CHECK_TOKEN?.trim();
  if (!appCheckToken) {
    return response.status(503).json({ error: "Upstream Home proxy is not configured" });
  }

  const home = await proxyUpstreamHome(appCheckToken);
  if (!home) {
    return response.status(502).json({ error: "Upstream Home request failed" });
  }

  response.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  return response.status(200).json(home);
}
