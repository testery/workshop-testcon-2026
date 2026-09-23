# Infrastructure

Built 2026-09-23 in the Testery AWS account (498550306017), region us-east-1. Everything is
tagged `Project=workshop-testcon-2026`.

## What exists

| Resource | Name / id | Notes |
| --- | --- | --- |
| EKS cluster | `workshop-testcon-2026` (v1.33) | Fargate only, no EC2 nodes. Created with `eksctl` from `cluster.yaml` (copy in the Drive folder). |
| Fargate profiles | `fp-system` (kube-system, default), `fp-previews` (namespaces `pr-*`) | A PR namespace outside `pr-*` will never schedule. |
| VPC | created by eksctl (`eksctl-workshop-testcon-2026-cluster` stack) | 2 public + 2 private subnets, 1 NAT gateway. |
| AWS Load Balancer Controller | helm release in kube-system, IRSA role | Manages one ALB for ingress group `workshop`. |
| ALB | ingress group `workshop` | Host-based routing, ACM cert attached, HTTP redirects to HTTPS. |
| ACM certificate | `testcon.testery.academy` + `*.testcon.testery.academy` | DNS validated in Route53 zone `testery.academy`. |
| Route53 | `testcon.testery.academy` A alias, `*.testcon.testery.academy` A alias | Both point at the ALB. |
| ECR | `workshop-testcon-2026/api`, `workshop-testcon-2026/web` | Untagged images expire after 3 days. |
| IAM | role `workshop-testcon-2026-github-actions` | Trusts GitHub OIDC for this repo. ECR push on the two repos + `eks:DescribeCluster`. Mapped to cluster admin via an EKS access entry. The `testery` org uses GitHub's immutable OIDC subjects, so the trust policy allows both `repo:testery/workshop-testcon-2026:*` and `repo:testery@36372680/workshop-testcon-2026@1383776990:*`. |
| IAM | OIDC provider `token.actions.githubusercontent.com` | New in this account; other repos can reuse it. |
| IAM | policy `workshop-testcon-2026-alb-controller` | Standard controller policy. |

Attendees never receive AWS credentials. Their PR workflows assume the role above; the role
can only push to the workshop ECR repos and talk to the workshop cluster.

## Cost (estimate)

| Item | Rate | Month | Workshop day |
| --- | --- | --- | --- |
| EKS control plane | $0.10/h | ~$73 | $2.40 |
| NAT gateway | $0.045/h + data | ~$33 | ~$1.50 |
| ALB | ~$0.0225/h + LCU | ~$17 | ~$0.60 |
| Fargate, idle (home page + controller) | 2 pods x 0.25 vCPU/0.5 GB | ~$20 | $0.66 |
| Fargate, previews | 3 pods per PR, ~$0.041/h per PR | | 40 PRs x 8h = ~$13 |
| ECR storage | ~40 image pairs x 0.4 GB | | ~$1.50 |

Running from 23 September to 21 October: roughly **$130 to $150** total. Fargate pods for a
PR cost about a dollar a day, so an orphaned preview is cheap, but the sweeper still deletes
them after 24h.

## Recreate from scratch

1. `eksctl create cluster -f cluster.yaml` (15 min).
2. `bash setup-cluster.sh` (IRSA + helm for the ALB controller, access entry for the GitHub
   role, home page, DNS). Both files are in the Drive folder under `infra/`.
3. GitHub repo variables (see setup-checklist.md).

## Testery project JSON

To create the project in the workshop workspace via the API. Keep the Git fields **blank**:
the pipeline uploads each commit's tests as a build artifact, and Testery only uses uploaded
artifacts when the project has no connected repository (a connected repo makes it clone
from Git instead, which fails for this private repo and ends in "No tests run"). The API
requires the three Git fields to be present, so send empty strings. In the web UI, simply
do not pick a repository.

```bash
curl -X POST https://api.testery.io/api/projects -H "Authorization: Bearer $TESTERY_TOKEN" \
  -H "Content-Type: application/json" -d '{"key":"workshop-testcon-2026","name":"Workshop TestCon 2026",
  "description":"","gitProvider":"","gitOwner":"","gitRepo":"",
  "configFile":"playwright.config.ts","testingFramework":"Playwright","cancelOlderTestRunsIfEquivalent":false,
  "defaultMaxRunners":4,"testRunTimeoutMinutes":60,"testTimeoutSeconds":300,"hasTests":true,
  "defaultToParallelizeByFile":true,"recordVideo":true,"testArtifacts":[],"testPackages":[],"testTags":[]}'
```

## Teardown (after 20 October)

```bash
# 1. previews and the home page
kubectl delete ns -l workshop.testery.io/preview=true
kubectl -n default delete ingress workshop-home        # lets the controller delete the ALB
sleep 120
# 2. cluster (also removes the VPC, NAT, IRSA roles, Fargate profiles)
eksctl delete cluster --name workshop-testcon-2026 --region us-east-1
# 3. leftovers
aws ecr delete-repository --repository-name workshop-testcon-2026/api --force
aws ecr delete-repository --repository-name workshop-testcon-2026/web --force
aws iam delete-role-policy --role-name workshop-testcon-2026-github-actions --policy-name workshop-ecr-eks
aws iam delete-role --role-name workshop-testcon-2026-github-actions
aws iam delete-policy --policy-arn arn:aws:iam::498550306017:policy/workshop-testcon-2026-alb-controller
aws acm delete-certificate --certificate-arn <arn from acm-arn.txt>
# Route53: delete the two testcon.testery.academy alias records and the _acme validation CNAME.
```

Keep the OIDC provider; it is harmless and useful for other repos.
