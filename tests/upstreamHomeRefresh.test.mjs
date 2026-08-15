import test from "node:test";
import assert from "node:assert/strict";

import { captureOfficialAppCheckToken } from "../scripts/refresh-upstream-home-token.mjs";

test("captureOfficialAppCheckToken returns only the successful upstream POST token", async () => {
  let responseListener;
  let closed = false;
  const page = {
    on(event, listener) {
      assert.equal(event, "response");
      responseListener = listener;
    },
    async goto(url) {
      assert.match(url, /^https:\/\/aoe4guides\.com\/\?appcheck-refresh=/);
      await responseListener({
        request: () => ({ method: () => "OPTIONS" }),
        url: () => "https://content-firebaseappcheck.googleapis.com/exchangeRecaptchaV3Token",
        status: () => 200,
      });
      await responseListener({
        request: () => ({ method: () => "POST" }),
        url: () => "https://content-firebaseappcheck.googleapis.com/exchangeRecaptchaV3Token",
        status: () => 200,
        async json() { return { token: "fresh-official-token" }; },
      });
    },
  };
  const puppeteer = {
    async launch(options) {
      assert.equal(options.headless, false);
      return {
        async newPage() { return page; },
        async close() { closed = true; },
      };
    },
  };

  assert.equal(await captureOfficialAppCheckToken(puppeteer), "fresh-official-token");
  assert.equal(closed, true);
});
