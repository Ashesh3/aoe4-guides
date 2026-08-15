import test from "node:test";
import assert from "node:assert/strict";

import {
  getLiveBuild,
  liveBuildUrl,
} from "../src/composables/data/liveBuildService.js";
import * as liveBuildService from "../src/composables/data/liveBuildService.js";

const LIVE_BUILD = {
  author: "Jockxtar",
  authorUid: "x2QTPsoVaXedO3Kk3BHMtabX3r63",
  title: "Golden Horde | Feudal All-in",
  video: "",
  civ: "GOH",
  map: "",
  season: "Season 12",
  strategy: "Rush",
  isDraft: false,
  comments: 0,
  timeCreated: { _seconds: 1762363866, _nanoseconds: 704000000 },
  id: "CroZRSJRDDcQvM3tY58o",
  steps: [
    {
      age: 1,
      gameplan: "",
      type: "age",
      steps: [
        {
          builders: "1",
          villagers: "",
          food: "4+",
          description: "5 villagers to sheep",
          gold: "",
          wood: "",
          stone: "",
          time: "0:00",
        },
      ],
    },
  ],
  sortTitle: "golden horde | feudal all-in",
  timeUpdated: { _seconds: 1762717652, _nanoseconds: 309000000 },
  description: "A production build",
  upvotes: 0,
  likes: 0,
  scoreAllTime: 0,
  ageTimings: {},
  score: 0,
  views: 107,
};

test("liveBuildUrl points build reads at the aoe4guides.com production API", () => {
  assert.equal(
    liveBuildUrl("a build/id"),
    "https://aoe4guides.com/api/builds/a%20build%2Fid"
  );
});

test("getLiveBuild returns the production document in the timestamp shape used by the UI", async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, "https://aoe4guides.com/api/builds/CroZRSJRDDcQvM3tY58o");
    return {
      ok: true,
      async json() {
        return structuredClone(LIVE_BUILD);
      },
    };
  };

  const build = await getLiveBuild("CroZRSJRDDcQvM3tY58o", fetchImpl);

  assert.equal(build.title, "Golden Horde | Feudal All-in");
  assert.deepEqual(build.timeCreated, { seconds: 1762363866, nanoseconds: 704000000 });
  assert.deepEqual(build.timeUpdated, { seconds: 1762717652, nanoseconds: 309000000 });
  assert.equal(build.steps[0].steps[0].food, "4+");
});

test("getLiveBuild rejects missing and malformed production responses", async () => {
  const missing = await getLiveBuild("missing", async () => ({ ok: false }));
  const malformed = await getLiveBuild("bad", async () => ({
    ok: true,
    async json() {
      return { message: "not a build" };
    },
  }));

  assert.equal(missing, undefined);
  assert.equal(malformed, undefined);
});

test("getLiveDashboard loads and filters all three public dashboard lanes", async () => {
  assert.equal(typeof liveBuildService.getLiveDashboard, "function");

  const matching = (id, title) => ({
    ...structuredClone(LIVE_BUILD),
    id,
    title,
    civ: "GOH",
    creatorId: "creator-1",
    season: "Season 12",
    map: "Open",
    strategy: "Rush",
  });
  const rejected = {
    ...matching("rejected", "Wrong season"),
    season: "Season 11",
  };
  const responses = new Map([
    [
      "https://aoe4guides.com/api/builds?civ=GOH&orderBy=score",
      [matching("trending", "Trending build"), rejected],
    ],
    [
      "https://aoe4guides.com/api/builds?civ=GOH&orderBy=views",
      [matching("classic", "Classic build"), rejected],
    ],
    [
      "https://aoe4guides.com/api/builds?civ=GOH&orderBy=timeCreated",
      [matching("recent", "Recent build"), rejected],
    ],
  ]);
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    return {
      ok: responses.has(url),
      async json() {
        return structuredClone(responses.get(url));
      },
    };
  };
  const config = {
    civs: "GOH",
    creator: "creator-1",
    seasons: ["Season 12"],
    maps: ["Open"],
    strategies: ["Rush"],
    drafts: false,
  };

  const dashboard = await liveBuildService.getLiveDashboard(config, fetchImpl);

  assert.deepEqual(requested, [...responses.keys()]);
  assert.deepEqual(dashboard.popular.map((build) => build.id), ["trending"]);
  assert.deepEqual(dashboard.classics.map((build) => build.id), ["classic"]);
  assert.deepEqual(dashboard.recent.map((build) => build.id), ["recent"]);
  assert.equal(dashboard.hasResults, true);
  assert.deepEqual(dashboard.popular[0].timeCreated, {
    seconds: 1762363866,
    nanoseconds: 704000000,
  });
});

test("getLiveDashboardCount reports only an authoritative empty result", async () => {
  assert.equal(typeof liveBuildService.getLiveDashboardCount, "function");

  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return [structuredClone(LIVE_BUILD)];
    },
  });

  assert.equal(await liveBuildService.getLiveDashboardCount({ civs: "GOH" }, fetchImpl), null);
  assert.equal(
    await liveBuildService.getLiveDashboardCount(
      { civs: "GOH" },
      async () => ({ ok: true, async json() { return []; } })
    ),
    0
  );
});

test("getLiveHome replaces every Home skeleton from public production data", async () => {
  assert.equal(typeof liveBuildService.getLiveHome, "function");

  const build = (id, authorUid, author, views, timeCreated) => ({
    ...structuredClone(LIVE_BUILD),
    id,
    authorUid,
    author,
    views,
    timeCreated: { _seconds: timeCreated, _nanoseconds: 0 },
  });
  const responses = new Map([
    [
      "https://aoe4guides.com/api/builds?orderBy=score",
      [
        {
          ...build("popular-1", "author-a", "Alpha", 40, 1762363866),
          video: "https://youtu.be/popularVideo",
        },
        build("popular-draft", "author-x", "Draft", 999, 1762363866),
      ],
    ],
    [
      "https://aoe4guides.com/api/builds?orderBy=views",
      [
        build("classic-1", "author-a", "Alpha", 100, 1762363866),
        build("classic-2", "author-b", "Beta", 60, 1762277466),
      ],
    ],
    [
      "https://aoe4guides.com/api/builds?orderBy=timeCreated",
      [
        {
          ...build("recent-1", "author-c", "Gamma", 20, 1762450266),
          video: "https://www.youtube.com/embed/recentVideo",
        },
        {
          ...build("recent-2", "author-a", "Alpha", 10, 1762363866),
          video: "https://www.youtube.com/watch?v=popularVideo",
        },
      ],
    ],
  ]);
  responses.set(
    "https://aoe4guides.com/api/builds?civ=GOH&orderBy=timeCreated",
    [
      ...responses.get("https://aoe4guides.com/api/builds?orderBy=timeCreated"),
      build("recent-3", "author-d", "Delta", 8, 1762277466),
    ]
  );
  responses.get("https://aoe4guides.com/api/builds?orderBy=score")[1].isDraft = true;

  const home = await liveBuildService.getLiveHome(async (url) => ({
    ok: responses.has(url),
    async json() {
      return structuredClone(responses.get(url));
    },
  }));

  assert.deepEqual(home.popularBuilds.map((item) => item.id), ["popular-1"]);
  assert.deepEqual(home.allTimeClassics.map((item) => item.id), ["classic-1", "classic-2"]);
  assert.deepEqual(home.recentBuilds.map((item) => item.id), ["recent-1", "recent-2", "recent-3"]);
  assert.deepEqual(home.recentCivBuilds, [
    { civ: "GOH", timeCreated: { seconds: 1762450266, nanoseconds: 0 } },
  ]);
  assert.deepEqual(home.recentVideos, ["recentVideo", "popularVideo"]);
  assert.equal("topContributors" in home, false);
});

test("getLiveHome settles to empty lists when the public API is unavailable", async () => {
  assert.equal(typeof liveBuildService.getLiveHome, "function");

  const home = await liveBuildService.getLiveHome(async () => {
    throw new Error("offline");
  });

  assert.deepEqual(home, {
    popularBuilds: [],
    allTimeClassics: [],
    recentBuilds: [],
    recentCivBuilds: [],
    recentVideos: [],
    buildsCount: null,
  });
});

test("automatic App Check refresh runs only on official or debug hosts", () => {
  assert.equal(typeof liveBuildService.shouldAutoRefreshAppCheck, "function");

  assert.equal(liveBuildService.shouldAutoRefreshAppCheck("aoe4guides.com"), true);
  assert.equal(liveBuildService.shouldAutoRefreshAppCheck("www.aoe4guides.com"), true);
  assert.equal(liveBuildService.shouldAutoRefreshAppCheck("aoe4-guides.vercel.app"), false);
  assert.equal(liveBuildService.shouldAutoRefreshAppCheck("aoeguides.ashesh.dev"), false);
  assert.equal(liveBuildService.shouldAutoRefreshAppCheck("localhost", "debug-token"), true);
});
