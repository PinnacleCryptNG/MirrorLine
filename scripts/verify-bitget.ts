import { runBitgetVerification } from "../lib/bitget/verify";

async function main() {
  const symbol = process.argv[2] ?? "rAAPL";
  const report = await runBitgetVerification(symbol);
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
