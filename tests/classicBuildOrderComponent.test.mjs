import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, URL } from "node:url";

import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";

const passthrough = (tag) =>
  defineComponent({
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      return () => h(tag, attrs, slots.default?.());
    },
  });

test("ClassicBuildOrder renders the old resource assignment table", async (t) => {
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../src", import.meta.url)),
      },
    },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  t.after(() => vite.close());

  const { default: ClassicBuildOrder } = await vite.ssrLoadModule(
    "/src/components/builds/ClassicBuildOrder.vue"
  );

  const app = createSSRApp(ClassicBuildOrder, {
    steps: [
      {
        type: "age",
        age: 1,
        gameplan: "",
        steps: [
          {
            time: "0:00",
            builders: "1",
            food: "4+",
            wood: "",
            gold: "",
            stone: "",
            description: "Send villagers to sheep",
          },
        ],
      },
      {
        type: "ageUp",
        age: 1,
        gameplan: "",
        steps: [{ time: "2:40", builders: "4", food: "3", wood: "3", gold: "3" }],
      },
    ],
  });

  app.component("v-card", passthrough("section"));
  app.component("v-icon", passthrough("span"));
  app.component("v-spacer", passthrough("span"));
  app.component("v-btn", passthrough("button"));

  const html = await renderToString(app);

  assert.match(html, /data-testid="classic-build-order"/);
  assert.match(html, /aria-label="Villager count"[^>]*>5</);
  assert.match(html, /data-resource="builders"[^>]*>1</);
  assert.match(html, /data-resource="food"[^>]*>4\+</);
  assert.match(html, /data-resource="wood"[^>]*><\/td>/);
  assert.match(html, /data-resource="gold"[^>]*><\/td>/);
  assert.match(html, /data-resource="stone"[^>]*><\/td>/);
  assert.match(html, /Age up to Feudal Age/);
  assert.match(html, /Send villagers to sheep/);
});
