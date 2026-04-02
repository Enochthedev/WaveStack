/**
 * Bootstrap entry point — uses require() so crash handlers and breadcrumbs
 * actually execute before each module loads (static imports get hoisted past
 * console.log in CommonJS output).
 */

process.on("uncaughtException", (err) => {
  console.error("[bootstrap] FATAL uncaughtException:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[bootstrap] FATAL unhandledRejection:", reason);
  process.exit(1);
});

function step(label: string, mod: string) {
  console.log(`[bootstrap] ${label}...`);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(mod);
  } catch (err) {
    console.error(`[bootstrap] FATAL — failed at "${label}":`, err);
    process.exit(1);
  }
}

step("Loading tracer", "./shared/tracer");
step("Loading server", "./server");
