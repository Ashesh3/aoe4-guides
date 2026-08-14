const LIVE_SITE_ORIGIN = "https://aoe4guides.com";
const LIVE_DASHBOARD_LANES = [
  ["popular", "score"],
  //The public API does not expose scoreAllTime. Views is its documented
  //all-time popularity order, and preserves the lane's meaning without making
  //a Firestore request that App Check will reject on a personal domain.
  ["classics", "views"],
  ["recent", "timeCreated"],
];

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
 * Whether this hostname may proactively mint production App Check tokens.
 *
 * The production reCAPTCHA key is domain-restricted. Asking it for a token on
 * a Vercel or personal hostname can only fail, and automatic refresh makes that
 * failure happen at startup even on pages that use the public read-only API.
 * A configured debug token is the explicit local-development exception.
 *
 * @param {string} hostname
 * @param {string|boolean|null} debugToken
 * @return {boolean}
 */
export function shouldAutoRefreshAppCheck(hostname, debugToken = null) {
  if (debugToken) return true;
  const host = String(hostname ?? "").toLowerCase();
  return host === "aoe4guides.com" || host === "www.aoe4guides.com";
}

function liveBuildsUrl({ civ, author, orderBy } = {}) {
  const query = new URLSearchParams();
  if (civ) query.set("civ", civ);
  if (author) query.set("author", author);
  if (orderBy) query.set("orderBy", orderBy);
  const suffix = query.toString();
  return `${LIVE_SITE_ORIGIN}/api/builds${suffix ? `?${suffix}` : ""}`;
}

function inSelected(value, selected) {
  return !Array.isArray(selected) || selected.length === 0 || selected.includes(value ?? "");
}

function matchesDashboardFilters(build, config) {
  if (!build || typeof build !== "object") return false;
  if (config?.civs && build.civ !== config.civs) return false;
  if (config?.creator && build.creatorId !== config.creator) return false;
  if (!inSelected(build.season, config?.seasons)) return false;
  if (!inSelected(build.map, config?.maps)) return false;
  if (!inSelected(build.strategy, config?.strategies)) return false;
  return config?.drafts ? build.isDraft === true : build.isDraft !== true;
}

async function getLiveBuilds(config, orderBy, fetchImpl) {
  try {
    const response = await fetchImpl(
      liveBuildsUrl({ civ: config?.civs, author: config?.author, orderBy })
    );
    if (!response?.ok) return [];

    const builds = await response.json();
    if (!Array.isArray(builds)) return [];
    return reviveApiTimestamps(builds).filter((build) => matchesDashboardFilters(build, config));
  } catch (error) {
    console.error("liveBuildService.getLiveBuilds failed:", error?.message ?? error);
    return [];
  }
}

/**
 * Loads the three civilization Dashboard lanes from the production read-only
 * API. One API query per sort is required because the endpoint caps each
 * ordered result at ten and offers no pagination or count route.
 *
 * The API has no count endpoint, so the only authoritative count is zero when
 * every lane is empty. A populated response reports `hasResults` instead of an
 * invented total.
 *
 * @param {Object} config
 * @param {Function} fetchImpl
 * @return {Promise<{popular:Array,classics:Array,recent:Array,hasResults:boolean}>}
 */
export async function getLiveDashboard(config = {}, fetchImpl = fetch) {
  const laneResults = await Promise.all(
    LIVE_DASHBOARD_LANES.map(async ([name, orderBy]) => [
      name,
      await getLiveBuilds(config, orderBy, fetchImpl),
    ])
  );
  const lanes = Object.fromEntries(laneResults);
  const hasResults = [...lanes.popular, ...lanes.classics, ...lanes.recent].length > 0;

  return { ...lanes, hasResults };
}

export async function getLiveDashboardCount(config = {}, fetchImpl = fetch) {
  return (await getLiveDashboard(config, fetchImpl)).hasResults ? null : 0;
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
