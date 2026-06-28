import { performSync } from "../lib/db/sync";

async function main() {
  console.log("Starting manual database sync script...");
  try {
    const stats = await performSync();
    console.log("Database sync completed successfully:", stats);
    process.exit(0);
  } catch (err) {
    console.error("Database sync failed with error:", err);
    process.exit(1);
  }
}

main();
