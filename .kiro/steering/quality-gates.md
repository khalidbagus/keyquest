# Quality Gates

## Before Marking a Task Complete

Every task must pass these checks:

### 1. Build Passes

```bash
npm run build
```
Zero errors. Warnings should be addressed or explicitly documented.

### 2. Type Check Passes

```bash
npm run typecheck
```
No TypeScript errors in strict mode.

### 3. Lint Passes

```bash
npm run lint
```
No ESLint errors. Accessibility rules (jsx-a11y) must pass.

### 4. Relevant Tests Pass

```bash
npm test           # Unit tests
npm run test:e2e   # E2E tests (if task touches UI flow)
```

Run the specific test file(s) for the changed code. For new features, tests must exist before the task is complete.

## Test Requirements by Task Type

| Task Type | Required Tests |
|-----------|----------------|
| New component | Unit test for rendering, props |
| New defect | Playwright test confirming defect exists |
| New repair | Unit test for DOM changes, Playwright verification |
| State logic | Unit test for reducer/hook behavior |
| Bug fix | Regression test that fails before fix, passes after |

## Regression Prevention

When fixing a bug:
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Confirm the test passes
4. Do not delete the test

## Accessibility Testing

**App Shell changes:**
- Run axe-core via Playwright on affected views
- Zero violations (excluding sandbox)

**Sandbox changes:**
- Verify expected defects exist before repair
- Verify defects are resolved after repair

## Evidence of Work

When completing a task, report:

1. **What was done** — Brief summary of changes
2. **Files changed** — List of modified/created files
3. **Tests run** — Which tests were executed
4. **Test results** — Pass/fail status
5. **Verification** — How you confirmed correctness (build output, test output, manual check)

Example:
```
Done: Implemented Invisible Focus repair

Files: src/engines/RepairEngine.ts, src/components/RepairStudio/RepairCard.tsx
Tests: npm test -- RepairEngine.test.ts (3 passed)
       npm run test:e2e -- verification-focus.spec.ts (2 passed)
Build: npm run build (success, 0 errors)
```

## Checkpoint Tasks

Tasks labeled "Checkpoint" require:
- All prior tasks in the section complete
- Full test suite run (`npm test && npm run test:e2e`)
- axe-core accessibility scan on app shell
- Manual keyboard navigation test
- Build verification (`npm run build && npm run preview`)

## Property Tests (Optional)

Tasks marked with `*` are optional property-based tests. They validate correctness invariants but can be skipped for faster MVP delivery. If skipped, note it in the task completion report.

## Do Not Merge If

- Build fails
- Type errors exist
- Lint errors exist (warnings acceptable with justification)
- Relevant tests fail
- New feature lacks tests
- Accessibility regression in app shell (axe violations)
