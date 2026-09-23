# Module 6: Adding tests to CI/CD

**Lab (15 min): run the suite on Testery from the pipeline, and block the PR when it fails.**

## Where we are

The preview deploys, the suite runs from a laptop. Now the pipeline runs it, on Testery's
grid, in parallel, and reports the result on the PR as a check.

## Steps

1. Add an `e2e` job to `.github/workflows/preview-deploy.yml`, after `deploy`:
   ```yaml
     e2e:
       name: End-to-end tests on Testery
       needs: [build, deploy]
       runs-on: ubuntu-24.04
       env:
         TESTERY_TOKEN: ${{ secrets.TESTERY_TOKEN }}
         TESTERY_PROJECT: ${{ vars.TESTERY_PROJECT_KEY }}
         ENV_KEY: ${{ needs.build.outputs.namespace }}
         HOST: ${{ needs.build.outputs.host }}
         BUILD_ID: ${{ needs.build.outputs.sha_short }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with:
             python-version: "3.12"
         - name: Install the Testery CLI
           run: pip install --quiet --upgrade testery
   ```
2. Register the preview as a Testery **environment**. The environment carries `BASE_URL`,
   which is the only thing the suite needs to know:
   ```yaml
         - name: Register this preview as a Testery environment
           run: |
             testery create-environment --token "$TESTERY_TOKEN" --key "$ENV_KEY" \
               --name "PR #${{ github.event.pull_request.number }} ${{ github.head_ref }}" \
               --variable "BASE_URL=https://$HOST" --ignore-already-exists-error
             testery update-environment --token "$TESTERY_TOKEN" --key "$ENV_KEY" \
               --name "PR #${{ github.event.pull_request.number }} ${{ github.head_ref }}" \
               --variable "BASE_URL=https://$HOST"
   ```
3. Upload **this commit's** tests and run them. The tests come from the same commit as the
   app, always. playwright-bdd generates the runnable specs from the `.feature` files, so
   generate them first and ship them in the bundle:
   ```yaml
         - uses: actions/setup-node@v4
           with:
             node-version: "20"
             cache: npm
             cache-dependency-path: web/package-lock.json

         - name: Generate the specs and upload this commit's tests
           run: |
             (cd web && npm ci && npx bddgen)
             (cd web && zip -qr ../tests.zip . -x 'node_modules/*' 'test-results/*' 'playwright-report/*' 'dist/*' 'tests/.auth/*')
             testery upload-build-artifacts --token "$TESTERY_TOKEN" --project-key "$TESTERY_PROJECT" \
               --build-id "$BUILD_ID" --branch "${{ github.head_ref }}" --path tests.zip

         - name: Run the suite against the preview
           run: |
             testery create-test-run --token "$TESTERY_TOKEN" --project-key "$TESTERY_PROJECT" \
               --environment-key "$ENV_KEY" --build-id "$BUILD_ID" \
               --git-ref "${{ github.event.pull_request.head.sha }}" --git-branch "${{ github.head_ref }}" \
               --status-name "Testery E2E" --wait-for-results --fail-on-failure --output pretty
   ```
4. In `preview-destroy.yml`, delete the Testery environment too:
   ```yaml
         - name: Remove the Testery environment
           continue-on-error: true
           run: |
             pip install --quiet --upgrade testery
             testery delete-environment --token "${{ secrets.TESTERY_TOKEN }}" --key "$NAMESPACE"
   ```
5. Push. Watch the run in GitHub and in https://app.testery.io (Test Runs). Open a failing
   test's video and trace when you have one; you will in Module 7.

Finished state: tag `module-06-complete`.

## Make it fail on purpose

Change the expected heading in `web/tests/features/navigation.feature` from `Employees` to
`Employeez`, push, and watch: the deploy succeeds, the e2e job fails, and the PR shows a red
check. Fix it and push again. That red check is the quality gate; on `main` it is a required
status, so a PR with a red suite cannot merge.

## What to notice

- The environment key is the namespace name, so one PR = one environment in both systems.
- `--wait-for-results --fail-on-failure` is what turns a test run into a gate.
- Testery runs the suite in parallel across runners. The suite has to be safe for that
  (Module 5). If your tests share state, you find out here, loudly.
- Flaky tests: quarantine them (Testery can do this per project), keep the gate, fix them
  within the week. Retrying forever is how gates get bypassed.

## Checkpoint

Your PR shows a `Testery E2E` check, green, with the run visible in the Testery workspace.

Stuck? `scripts/catchup.sh 6`
