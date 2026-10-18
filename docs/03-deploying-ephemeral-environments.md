# Module 3: Deploying ephemeral environments

> [!TIP]
> Copy-paste commands for this module's labs, with the fixes from the rehearsal, are in [LAB-STEPS.md](LAB-STEPS.md) under **Module 3**.

Two labs. 3a deploys your PR to Kubernetes and posts the URL back. 3b tears it down when the
PR closes.

The manifests in `k8s/preview/` are already written; read them first (10 minutes well spent):

| File | What it does |
| --- | --- |
| `00-namespace.yaml` | One namespace per PR, labelled so the sweeper can find it |
| `10-config.yaml` | ConfigMap + Secret with the per-environment settings |
| `20-postgres.yaml` | A throwaway Postgres (emptyDir) and its Service |
| `30-migrate-job.yaml` | A Job per deploy: Flyway (init container) migrates the app schema, then Django migrates its framework tables |
| `40-api.yaml`, `50-web.yaml` | The two app Deployments and Services |
| `60-ingress.yaml` | Host-based routing on a shared AWS load balancer |

Every `${VARIABLE}` is filled in by `envsubst` in the pipeline. Nothing is hardcoded to a
branch.

## Lab 3a (15 min): deploy on every push

Open `.github/workflows/preview-deploy.yml` on your branch. The `build` job is done. Replace
the placeholder `deploy` job with the real thing. Work through it step by step; each step is
one thing the pipeline has to be able to do.

1. **Authenticate to AWS** with the same OIDC role the build job used:
   ```yaml
      - name: Authenticate to AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
   ```
2. **Point kubectl at the cluster:**
   ```yaml
      - name: Point kubectl at the cluster
        run: aws eks update-kubeconfig --name "$EKS_CLUSTER" --region "$AWS_REGION"
   ```
3. **Apply the manifests** with the variables filled in. Note the `env:` block; those are the
   `${...}` placeholders in `k8s/preview/*.yaml`:
   ```yaml
      - name: Create or update the environment
        env:
          NAMESPACE: ${{ needs.build.outputs.namespace }}
          HOST: ${{ needs.build.outputs.host }}
          API_IMAGE: ${{ needs.build.outputs.api_image }}
          WEB_IMAGE: ${{ needs.build.outputs.web_image }}
          MIGRATIONS_IMAGE: ${{ needs.build.outputs.migrations_image }}
          GIT_SHA_SHORT: ${{ needs.build.outputs.sha_short }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          BRANCH: ${{ github.head_ref }}
          CERT_ARN: ${{ vars.PREVIEW_CERT_ARN }}
        run: |
          for f in k8s/preview/*.yaml; do envsubst < "$f"; echo "---"; done | kubectl apply -f -
   ```
4. **Wait for the migration Job, then the rollouts:**
   ```yaml
      - name: Wait for the database migration
        run: kubectl -n "${{ needs.build.outputs.namespace }}" wait --for=condition=complete --timeout=600s "job/migrate-${{ needs.build.outputs.sha_short }}"

      - name: Wait for the rollout
        run: |
          kubectl -n "${{ needs.build.outputs.namespace }}" rollout status deploy/api --timeout=600s
          kubectl -n "${{ needs.build.outputs.namespace }}" rollout status deploy/web --timeout=600s
   ```
5. **Wait until the URL answers.** The load balancer needs a moment to learn the new host:
   ```yaml
      - name: Wait until the URL answers
        env:
          HOST: ${{ needs.build.outputs.host }}
        run: |
          for i in $(seq 1 60); do
            code=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/api/health/" || true)
            if [ "$code" = "200" ]; then echo "https://$HOST is up"; exit 0; fi
            echo "attempt $i: HTTP $code"; sleep 10
          done
          exit 1
   ```
6. **Post the URL on the PR:**
   ```yaml
      - name: Post the URL on the pull request
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: preview
          message: |
            ### Preview environment
            :rocket: **https://${{ needs.build.outputs.host }}**
   ```
7. Commit, push, and watch the run. First deploy takes 3 to 5 minutes (Fargate pods start
   cold). When the comment appears, open the URL and sign in. That is your environment.

The finished job is in the tag `module-03-complete` if you want to compare.

## Lab 3b (10 min): tear it down

Create `.github/workflows/preview-destroy.yml` on your branch:

```yaml
name: Preview Environment Teardown

on:
  pull_request:
    types: [closed]

permissions:
  contents: read
  id-token: write

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER: ${{ vars.EKS_CLUSTER }}
  NAMESPACE: pr-${{ github.event.pull_request.number }}

jobs:
  destroy:
    runs-on: ubuntu-24.04
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - run: aws eks update-kubeconfig --name "$EKS_CLUSTER" --region "$AWS_REGION"
      - run: kubectl delete namespace "$NAMESPACE" --ignore-not-found --timeout=300s
```

Push it. Then test it for real: open a **second**, throwaway PR from a branch called
`<your-name>/throwaway`, wait for its preview comment, close the PR, and watch the teardown
run delete the namespace. Deleting the namespace deletes everything inside it, which is why
the namespace is the unit of isolation.

Also look at `.github/workflows/preview-sweeper.yml`. It runs hourly from `main` and
removes previews whose PR is closed or that are past their 24h TTL. Teardown fails
sometimes; the sweeper is the reason that does not cost money.

## What to notice

- `kubectl apply` is idempotent. The same command creates and updates. There is no
  "first deploy" special case.
- The migration Job has the commit in its name, so each deploy gets a new Job.
- Host = branch name, so the URL is predictable before the pipeline finishes:
  `scripts/preview-url.sh` prints it.
- The credentials never touch your laptop. The workflow assumes an AWS role through GitHub's
  OIDC token, scoped to this repo, this cluster and these ECR repositories.

## Checkpoint

Your PR has a preview comment with a working URL, and your throwaway PR's environment was
deleted when you closed it.

Stuck? `scripts/catchup.sh 3`
