import test from "node:test";
import assert from "node:assert/strict";

import {
  classicSections,
  visibleClassicEntries,
} from "../src/composables/builds/classicBuildOrder.js";

test("classicSections wraps builds saved before age sections existed", () => {
  const legacy = [{ time: "0:00", food: "6", description: "Start" }];

  assert.deepEqual(classicSections(legacy), [
    { type: "age", age: 0, gameplan: "", steps: legacy },
  ]);
});

test("visibleClassicEntries keeps notes and resolves the selected alternative in place", () => {
  const section = {
    type: "age",
    age: 2,
    gameplan: "Section note",
    steps: [
      { time: "4:00", food: "10", description: "Before" },
      {
        kind: "alternatives",
        paths: [
          { title: "Safe", main: true, steps: [{ gameplan: "If pressured" }, { time: "4:30", wood: "5", description: "Defend" }] },
          { title: "Greedy", steps: [{ gameplan: "If safe" }, { time: "4:20", stone: "5", description: "Second TC" }] },
        ],
      },
      { time: "5:00", gold: "5", description: "Continue" },
    ],
  };

  const entries = visibleClassicEntries(section, 3, { "3:1": 1 });

  assert.deepEqual(
    entries.map((entry) => [entry.kind, entry.id ?? entry.value?.description ?? entry.html ?? ""]),
    [
      ["step", "Before"],
      ["paths", "3:1"],
      ["note", "If safe"],
      ["step", "Second TC"],
      ["merge", "3:1"],
      ["step", "Continue"],
      ["note", "Section note"],
    ]
  );
  assert.equal(entries[1].active, 1);
});
