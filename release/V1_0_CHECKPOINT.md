# KeyQuest v1.0 release checkpoint

Prepared November 15, 2026 (WIB). This document records preparation, not a completed release or hackathon submission.

## Identity and publication

| Item | Status |
| --- | --- |
| Project | KeyQuest: The Haunted Accessibility Lab |
| Category | Kiroween 2026 — Costume Contest |
| Branch | `master` |
| Inspected source baseline | `5c0e8e43dcc8f9b8342c546ef8023d5283da643c` |
| Intended version | `1.0.0` |
| Public repository | Not yet created/verified; proposed owner/name: `khalidbagus/keyquest` |
| Release commit | Pending preparation commit; record the exact hash after committing |
| Release tag | `v1.0.0` recommended; not created or published |
| Public release date | Pending explicit publication approval |
| README | Replaced the template with inspected product/architecture/setup/verification documentation |
| License | MIT prepared for publication approval; dependency and template notices retained |
| Kiro evidence | 15 tracked files under root `.kiro/`; preserved unchanged |
| Devpost | Existing draft `1303156`, project `1548031`; overview/story/category/Kiro explanation/disclosures saved, cover uploaded; still Draft, 2/5 steps complete |
| Application/video | Deliberately deferred; no placeholder URLs |

## Independently executed checks

The earlier review in this same chat ran these against `5c0e8e4` on the same working tree before publication-only edits:

| Check | Observed result |
| --- | --- |
| `npm run build` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | 60/60, 9 files |
| Chromium Playwright suite, 2 workers, line reporter | 78/78, 4.8 minutes |
| Failed focus-verification probe | Confirmed missing retry control, including after reload/restore |

Publication preparation additionally ran `npm run typecheck` and ESLint successfully and installed the original lockfile with `npm ci` in a separate temporary folder (222 packages), preserving local diagnostic evidence in the existing `node_modules/`. Node version: 26.12.1; npm: 11.20.0. Production startup smoke checks passed for real loading, axe, JS/CSS load failures and keyboard retry; readiness after required assets was approximately 17.3 ms in that local run. Real menu/challenge screenshots were captured from the production preview.

The prior Kiro integration report separately records Firefox functional 59/59, Firefox scan-containing tests 14/15 with a native crash, WebKit functional 55/59 in an initial run, and WebKit scan-containing tests 14/15 in that run. Later focused regressions passed separately. These are historical reported runs, not a fresh all-green cross-browser matrix. No Firefox/WebKit rerun is asserted by this checkpoint.

The new GitHub Actions workflow runs lint, typecheck, unit tests, build, and serial Chromium tests on Node 26. It has not run on GitHub until the approved first push triggers it. It does not deploy.

## Security, privacy, and licensing review

- `npm audit --omit=dev`: zero reported production vulnerabilities on November 15, 2026.
- Full `npm audit`: seven moderate package findings from development-tool propagation of [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), a `minimatch` denial-of-service issue. No high/critical findings reported. Dependencies are preserved; no forced audit fix or unsupported cross-major override was applied.
- Pattern scan of 260 reachable Git blobs and 663 entries in seven retained trace ZIPs found no matches for the checked credential/private-key patterns. Pattern scans do not guarantee absence of secrets. Local-path metadata was detected in historical evidence.
- Existing commit metadata contains the developer's author email. Historical traces can contain local usernames, filesystem paths, browser/network metadata, and source snapshots.
- Generated reports/results are removed from the current index with `git rm --cached` and ignored for future runs; local files remain. **They remain in earlier Git commits and will travel with a history-preserving first push.** No history rewrite or authorship change is authorized or performed.
- Root MIT licensing covers project contributions, not a relicensing of dependencies or third-party trademarks. See [third-party notices](../THIRD_PARTY_NOTICES.md).
- All five retained starter image/SVG assets were byte-matched to the published `create-vite@9.3.4` template. Its full license/notices are retained. The new README/Devpost cover uses the built-in image-generation tool; prompt and provenance are recorded alongside it. Application behavior is unchanged.

## Known product and accessibility limitations

- Manual screen-reader, full zoom/reflow, and focus-clipping review remain pending.
- Native Firefox/axe crash and incomplete full WebKit validation remain unresolved. Parallel accessibility testing can be unstable.
- A failed verification can leave an applied repair without a retry button; a challenge reset clears progress. Preserved as a known v1.0 limitation.
- Escape dismisses the restore dialog by starting fresh and clearing saved progress.
- Naming/focus checks are limited DOM/style checks, not complete accessibility certification. Axe incomplete results require interpretation.

## Hackathon requirement check

Reviewed [official rules](https://kiroween.devpost.com/rules) and [overview](https://kiroween.devpost.com/) on November 15, 2026.

| Requirement | Evidence/status |
| --- | --- |
| Meaningful Kiro usage | Root specs, steering, hooks, agent and MCP configuration; developer-reported Kiro implementation/review history; write-up prepared |
| New project during submission period | Local commits begin November 14, 2026; developer must confirm original creation and ownership; dates alone are not proof |
| Functional project and instructions | Implemented source, tests, lockfile and README; fresh install checked |
| Public GitHub, open-source license, root `.kiro/` | Local preparation complete in part; publication/license confirmation pending |
| Category | Costume Contest selected in the existing draft and saved |
| Text description / Kiro explanation | Prepared locally and saved in the online draft |
| Functional application URL | Deferred, required before final submission |
| Public YouTube demonstration, under three minutes | Deferred, required before final submission |
| Eligibility, ownership, team declarations | Must be confirmed by entrant; no bonus eligibility invented |

Deadline: **December 4, 2026, 14:00 PST / December 5, 2026, 05:00 WIB**. Draft status must be retained until mandatory materials and entrant declarations are complete.

## Approval boundary and follow-up

Before public push, show the destination, exact staged diff/commit, license/asset questions, security findings, and historical report metadata. Obtain explicit approval. Create/publish `v1.0.0` and a GitHub release only with approval for the exact release commit. Verify the public source, README, LICENSE and `.kiro/` after publication, then record the URLs and commit.

No deployment, video creation/upload, v1.1 enhancement, destructive Git operation, or final Devpost submission is part of this preparation.

## Devpost access and remaining fields

Existing editor: https://devpost.com/submit-to/31667-kiroween-2026/manage/submissions/1303156-keyquest-the-haunted-accessibility-lab/edit

Observed preview path: https://devpost.com/software/keyquest-the-haunted-accessibility-lab (an editor preview link, not a claim of public publication).

The UI allowed saving story and additional-info drafts with mandatory final-submission fields empty. Overview, pitch, story, React/TypeScript/Kiro/Vite tags, Costume Contest category, Kiro explanation, pre-existing-work disclosure, and judge testing notes were saved. The thumbnail upload returned a loaded 333×222 cloud-hosted preview of the cover. The form remained Draft with 2/5 steps complete. No final terms agreement or Submit project action was taken.

The internal browser disconnected while attempting the optional screenshot gallery upload. After recovery, no internal browser provider was available; the attempted gallery upload is not claimed successful. Screenshots remain locally available. Enter the remaining country/entrant declarations and feedback from the user's supplied answers when access returns; do not put private entrant information in this public file. The legal-age declaration still requires the entrant's confirmation. Also add the verified GitHub URL after approved publication. Application and video links remain deferred.

The final submission page also instructs entrants to preserve submitted repository/video/application materials after the deadline until winners are announced. Future pre-deadline improvement work must remain distinct from this v1.0 checkpoint.
