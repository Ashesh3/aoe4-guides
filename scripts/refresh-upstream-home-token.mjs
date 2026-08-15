import { spawn } from "node:child_process";
import { once } from "node:events";

const ORIGIN = "https://aoe4guides.com";
const APP_CHECK_EXCHANGE = "exchangeRecaptchaV3Token";

function run(command, args, options = {}) {
  const { input, ...spawnOptions } = options;
  const child = spawn(command, args, {
    stdio: [input == null ? "ignore" : "pipe", "pipe", "pipe"],
    ...spawnOptions,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));
  if (input != null) child.stdin.end(input);
  return once(child, "exit").then(([code]) => {
    if (code !== 0) throw new Error(`${command} failed (${code}): ${stderr || stdout}`);
    return stdout;
  });
}

export async function captureOfficialAppCheckToken(puppeteer) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-position=-32000,-32000"],
  });
  try {
    const page = await browser.newPage();
    const tokenPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for App Check")), 60000);
      page.on("response", async (response) => {
        if (
          response.request().method() !== "POST" ||
          !response.url().includes(APP_CHECK_EXCHANGE) ||
          response.status() !== 200
        ) return;
        try {
          const token = (await response.json()).token;
          if (!token) return;
          clearTimeout(timeout);
          resolve(token);
        } catch {
          // A preflight can share the URL. Wait for the JSON POST response.
        }
      });
    });
    await page.goto(`${ORIGIN}/?appcheck-refresh=${Date.now()}`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    return await tokenPromise;
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!process.env.VERCEL_TOKEN) throw new Error("VERCEL_TOKEN is not set");
  const [{ default: puppeteer }] = await Promise.all([import("puppeteer-core")]);
  const token = await captureOfficialAppCheckToken(puppeteer);

  await run("npx", [
    "vercel",
    "link",
    "--yes",
    "--project",
    "aoe4-guides",
    "--token",
    process.env.VERCEL_TOKEN,
    "--scope",
    "ashsec",
  ]);
  await run("npx", [
    "vercel",
    "env",
    "add",
    "UPSTREAM_FIREBASE_APP_CHECK_TOKEN",
    "production",
    "--force",
    "--sensitive",
    "--token",
    process.env.VERCEL_TOKEN,
    "--scope",
    "ashsec",
  ], { input: token });

  // Vercel environment changes apply to new deployments only.
  await run("npx", [
    "vercel",
    "--prod",
    "--yes",
    "--token",
    process.env.VERCEL_TOKEN,
    "--scope",
    "ashsec",
  ]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.message ?? error);
    process.exit(1);
  });
}
