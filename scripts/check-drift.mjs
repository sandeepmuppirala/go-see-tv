#!/usr/bin/env node
// Drift check for this repo's two files that are meant to stay
// byte-identical (inside their marked regions) to their counterparts
// in the other two repos: src/app/auth/handoff/page.tsx against
// go-see-events (ORBI)'s own copy, and src/lib/entitlements.ts against
// beau's own copy. A network failure fetching a sibling repo is
// treated as "couldn't check", not confirmed drift -- it warns and
// exits 0 for that one check rather than failing the build over a
// transient issue unrelated to this repo's own code.
//
// Known limitation, not yet solved: beau and go-see-events are both
// PRIVATE repos (confirmed directly); unauthenticated
// raw.githubusercontent.com 404s on a private repo, so both of this
// script's own checks currently always hit the "couldn't check" path,
// never actually comparing anything. Fixing this would mean this repo
// (public) holding a read-scoped token for two other private repos --
// a real secret-provisioning decision, not something to wire in
// silently. go-see-events' and beau's own equivalent checks (fetching
// THIS repo, which is public) work fully today and already cover one
// direction of every pair.
import { readFileSync } from "node:fs";

const CHECKS = [
  {
    label: "handoff page",
    marker: "HANDOFF LOGIC",
    localPath: new URL("../src/app/auth/handoff/page.tsx", import.meta.url),
    remoteUrl: "https://raw.githubusercontent.com/sandeepmuppirala/go-see-events/main/frontend/src/app/auth/handoff/page.tsx",
    remoteLabel: "go-see-events's frontend/src/app/auth/handoff/page.tsx",
  },
  {
    label: "entitlements",
    marker: "ENTITLEMENTS LOGIC",
    localPath: new URL("../src/lib/entitlements.ts", import.meta.url),
    remoteUrl: "https://raw.githubusercontent.com/sandeepmuppirala/beau/main/src/lib/entitlements.ts",
    remoteLabel: "beau's src/lib/entitlements.ts",
  },
];

function extractSharedBlock(source, marker, label) {
  const re = new RegExp(`---BEGIN SHARED ${marker}---([\\s\\S]*?)---END SHARED ${marker}---`);
  const match = source.match(re);
  if (!match) {
    console.warn(`check-drift: could not find the shared-block markers in ${label} -- skipping (not a drift failure, the marker itself may have moved)`);
    return null;
  }
  return match[1].trim();
}

async function runCheck({ label, marker, localPath, remoteUrl, remoteLabel }) {
  const local = extractSharedBlock(readFileSync(localPath, "utf8"), marker, `this repo's ${label} file`);
  if (local === null) return true;

  let remoteText;
  try {
    const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`check-drift: fetching ${remoteLabel} returned ${res.status} -- skipping this check, not failing the build over it`);
      return true;
    }
    remoteText = await res.text();
  } catch (err) {
    console.warn(`check-drift: could not reach GitHub to check ${remoteLabel} (${err.message}) -- skipping this check, not failing the build over it`);
    return true;
  }

  const remote = extractSharedBlock(remoteText, marker, remoteLabel);
  if (remote === null) return true;

  if (local !== remote) {
    console.error(
      `check-drift: FAILED -- this repo's ${label} shared block has drifted from ${remoteLabel}.\n` +
        `These two files are meant to stay byte-identical inside their ---BEGIN/END SHARED ${marker}--- markers.\n` +
        "Either this is a real, intentional update to the shared logic (update BOTH repos together), or an accidental edit only touched one side."
    );
    return false;
  }
  console.log(`check-drift: ${label} shared block matches ${remoteLabel} — OK`);
  return true;
}

async function main() {
  const results = await Promise.all(CHECKS.map(runCheck));
  if (results.some((ok) => !ok)) process.exit(1);
}

main();
