import test from "node:test";
import assert from "node:assert/strict";

import {
  decodeFirestoreDocument,
  proxyUpstreamHome,
} from "../api/upstream-home.js";

const FIRESTORE_HOME = {
  fields: {
    buildsCount: { integerValue: "4202" },
    topContributors: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                authorId: { stringValue: "author-1" },
                displayName: { stringValue: "Valdemar" },
                viewCount: { integerValue: "968430" },
                boCount: { integerValue: "138" },
                icon: { stringValue: "https://example.com/avatar.webp" },
              },
            },
          },
        ],
      },
    },
    recentCivBuilds: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                civ: { stringValue: "BYZ" },
                timeCreated: { timestampValue: "2026-08-14T16:46:41.200Z" },
              },
            },
          },
        ],
      },
    },
  },
};

test("decodeFirestoreDocument preserves the authoritative Home payload", () => {
  assert.deepEqual(decodeFirestoreDocument(FIRESTORE_HOME), {
    buildsCount: 4202,
    topContributors: [
      {
        authorId: "author-1",
        displayName: "Valdemar",
        viewCount: 968430,
        boCount: 138,
        icon: "https://example.com/avatar.webp",
      },
    ],
    recentCivBuilds: [
      { civ: "BYZ", timeCreated: "2026-08-14T16:46:41.200Z" },
    ],
  });
});

test("proxyUpstreamHome forwards App Check only to the upstream Firestore read", async () => {
  const calls = [];
  const result = await proxyUpstreamHome("official-app-check-token", async (url, options) => {
    calls.push({ url, options });
    return { ok: true, async json() { return structuredClone(FIRESTORE_HOME); } };
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /projects\/aoe4-guides\/.*\/documents\/home\/home/);
  assert.deepEqual(calls[0].options.headers, {
    "X-Firebase-AppCheck": "official-app-check-token",
  });
  assert.equal(result.topContributors[0].viewCount, 968430);
});
