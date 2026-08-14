import test from "node:test";
import assert from "node:assert/strict";

import {
  getLiveBuild,
  liveBuildUrl,
} from "../src/composables/data/liveBuildService.js";

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
