const LIVE_SITE_ORIGIN = "https://aoe4guides.com";

/**
 * The production API URL for one public build.
 *
 * Kept independent of Firebase on purpose: the classic viewer is a read-only
 * client of the live site, not another authoring surface for whichever project
 * the local environment happens to configure.
 *
 * @param {string} buildId
 * @return {string}
 */
export function liveBuildUrl(buildId) {
  return `${LIVE_SITE_ORIGIN}/api/builds/${encodeURIComponent(buildId)}`;
}

/**
 * Converts the timestamp JSON emitted by the public API into the plain shape
 * every tolerant timestamp reader in the UI accepts.
 *
 * @param {*} value
 * @return {*}
 */
function reviveApiTimestamps(value) {
  if (Array.isArray(value)) return value.map(reviveApiTimestamps);
  if (!value || typeof value !== "object") return value;

  if (typeof value._seconds === "number") {
    return {
      seconds: value._seconds,
      nanoseconds: value._nanoseconds ?? 0,
    };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, reviveApiTimestamps(item)])
  );
}

/**
 * Reads one public build directly from aoe4guides.com.
 *
 * This deliberately has no fallback to the locally configured Firestore. A
 * page labelled as the live classic viewer either shows the live document or
 * shows that it could not be found; silently substituting development data
 * would make the same URL mean two different builds.
 *
 * @param {string} buildId
 * @param {Function} fetchImpl - Injectable only at the network boundary.
 * @return {Promise<Object|undefined>}
 */
export async function getLiveBuild(buildId, fetchImpl = fetch) {
  if (!buildId) return undefined;

  try {
    const response = await fetchImpl(liveBuildUrl(buildId));
    if (!response?.ok) return undefined;

    const build = await response.json();
    if (!build || typeof build !== "object" || !Array.isArray(build.steps)) {
      return undefined;
    }

    return reviveApiTimestamps(build);
  } catch (error) {
    console.error("liveBuildService.getLiveBuild failed:", error?.message ?? error);
    return undefined;
  }
}
