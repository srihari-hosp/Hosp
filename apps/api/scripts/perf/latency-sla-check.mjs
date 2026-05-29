#!/usr/bin/env node

const targetUrl = process.argv[2] || process.env.PERF_TARGET_URL || 'http://localhost:3001/health';
const totalRequests = Number(process.env.PERF_TOTAL_REQUESTS || 300);
const concurrency = Number(process.env.PERF_CONCURRENCY || 20);
const p95SlaMs = Number(process.env.PERF_SLA_P95_MS || 300);
const requestTimeoutMs = Number(process.env.PERF_REQUEST_TIMEOUT_MS || 5000);

const latencies = [];
let failures = 0;
let completed = 0;
let dispatched = 0;

const percentile = (values, p) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

const executeRequest = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const start = process.hrtime.bigint();
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      failures += 1;
      return;
    }

    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    latencies.push(elapsedMs);
  } catch {
    failures += 1;
  } finally {
    clearTimeout(timeout);
    completed += 1;
  }
};

const worker = async () => {
  while (true) {
    if (dispatched >= totalRequests) {
      return;
    }
    dispatched += 1;
    await executeRequest();
  }
};

const main = async () => {
  console.log(
    `Running latency SLA check: url=${targetUrl}, totalRequests=${totalRequests}, concurrency=${concurrency}, p95SlaMs=${p95SlaMs}`
  );

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);

  const successCount = latencies.length;
  const totalCount = successCount + failures;
  const failureRate = totalCount > 0 ? (failures / totalCount) * 100 : 100;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  console.log(
    JSON.stringify(
      {
        targetUrl,
        totalRequests: totalCount,
        successCount,
        failures,
        failureRatePercent: Number(failureRate.toFixed(2)),
        p50Ms: Number(p50.toFixed(2)),
        p95Ms: Number(p95.toFixed(2)),
        p99Ms: Number(p99.toFixed(2)),
        slaP95Ms: p95SlaMs,
      },
      null,
      2
    )
  );

  if (failures > 0) {
    console.error('Latency check failed: non-zero request failures observed.');
    process.exit(1);
  }

  if (p95 > p95SlaMs) {
    console.error(`Latency check failed: p95 ${p95.toFixed(2)}ms exceeds SLA ${p95SlaMs}ms.`);
    process.exit(1);
  }

  console.log('Latency check passed.');
};

main().catch((error) => {
  console.error('Latency check execution failed:', error);
  process.exit(1);
});
