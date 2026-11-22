# Clocktower Gate verification handoff

Use Kiro for implementation and focused developer checks. Use ZCode for repeatable checkpoint suites on the same KeyQuest workspace after the implementation stops changing. The [checkpoint tasks](tasks.md) still define what evidence is required. Run the full browser suite once per checkpoint on the intended dev-server setup.

## Close Checkpoint 2

Tasks 15–19 were implemented. The latest checkpoint report records 151 passes and one failure in `final-hardening.spec.ts` and lists the final snapshot as unrechecked. A separate local log records a green targeted recheck, but the report does not tie it to the final snapshot. Recheck the current files and preserve each test run as a separate result.

Paste this in ZCode once Kiro has finished editing. Open the existing KeyQuest repository in ZCode. The local Code Mode connection stays with Kiro for its screenshot evidence.

```text
Verify KeyQuest Clocktower Gate Checkpoint 2 in the existing KeyQuest workspace. This is a validation-only task. Keep the code, tests, settings, verification.md, and task checkboxes unchanged. Kiro has stopped implementation at Task 20. Read .kiro/specs/adventure-phase-3-clocktower-gate/verification.md and Tasks 20–21 in tasks.md. The report records 151/152 in the last full Chromium run. A prior local recheck log recorded 5/5 in final-hardening.spec.ts, but the report does not confirm a recheck on the final snapshot.

Use the existing dependencies. Run the following from the project root, in order:
1. npm run typecheck
2. npm run lint
3. npm run test:unit
4. npm run test:e2e -- --project=chromium --workers=1 --retries=0 --reporter=line --output=test-results-zcode/cp2-full

Run the full suite once on the repository's normal Vite development server. Confirm that localhost:5173 serves this workspace before reusing it. If that port is free, let Playwright start its own server. If another workspace owns it, report the conflict. Keep Kiro idle and source files static during the run. Use the normal dev server so source-URL fault-injection tests work.

Save terminal logs in the ignored test-results-zcode/ directory, outside the cp2-full Playwright artifact directory. If a browser test fails, preserve its trace and rerun only that failing test once on the same unchanged source, using --output=test-results-zcode/cp2-rerun. Report the full run and focused rerun separately. Record the first failing assertion and trace path. Treat hot reload and host load as hypotheses unless the evidence establishes a cause.

Return one concise handoff for Kiro with exit codes, pass/fail/skip counts, durations, and log paths. Label physical-device checks as not run. Leave Task 20 open for Kiro to reconcile and stop before Task 21.
```

The browser command from the repository root is:

```powershell
npm run test:e2e -- --project=chromium --workers=1 --retries=0 --reporter=line --output=test-results-zcode/cp2-full
```

After a green run, give Kiro the ZCode summary and log path. Ask it to reconcile the report and confirm Task 20's other evidence. The saved 375 × 667 control and outcome images show the gate status and journal while the gate itself is off-camera. For the required visual evidence, move the ghost near the gate before capturing both states in Code Mode. Stop before Task 21 for review.

## Future implementation milestones

Use this addendum on the Kiro implementation prompt:

```text
Implement the authorized tasks directly in this chat. Add or update the regression tests the spec calls for. Run typecheck and the focused tests needed while developing. Leave the final checkpoint gate open for ZCode to run once on the completed source. Hand off changed files, test names, any setup or seed instructions, and any focused failures. Keep the checkpoint's required Code Mode captures in Kiro. Stop editing once the verification handoff begins.
```

For later checkpoints, ZCode runs typecheck, lint, unit tests, build, the Phaser chunk check, and one full Chromium run. Serve the production build separately for the startup smoke test. Keep one browser worker and collect the log of any failure before a focused rerun.

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run build
node tests/production/clocktower-chunk.mjs
npm run test:e2e -- --project=chromium --workers=1 --retries=0 --reporter=line --output=test-results-zcode/full
# In a separate terminal, start the preview on a free port 4173.
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# While that preview is running, in the test terminal:
node tests/production/startup-smoke.mjs
```

Report each gate independently. The browser suite targets the development server and the startup smoke targets the production preview. Kiro records the test evidence and closes the checkpoint after it has been reviewed.
