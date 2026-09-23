# Before the workshop

You will get more out of the day if you arrive with these ready. Allow 30 minutes.

## Required

1. **A GitHub account.** You will be invited to the private repository
   `testery/workshop-testcon-2026` after you register. Accept the invitation before the
   workshop (check your GitHub notifications and email).
2. **Register** at https://testcon.testery.academy/register. It takes a minute and is how
   we invite you to GitHub and to the shared Testery workspace.
3. **Git** installed, and you can push to GitHub from your laptop (HTTPS with a token, or SSH).
   Test it: `git clone https://github.com/testery/workshop-testcon-2026.git`
4. **A laptop with a browser** and access to the conference wi-fi. All of the deployments
   happen in the cloud, so a modest machine is fine.

## Strongly recommended

5. **Docker Desktop** (or Docker Engine + Compose) so you can run the app locally.
   Test it: `docker compose version`
6. **Node.js 20 or newer** so you can run the Playwright tests from your laptop.
   Test it: `node --version`
7. **Python 3.12** if you want to run the API unit tests outside Docker. Optional.

## For Module 7 (AI-driven development)

8. **Claude Code** installed and signed in: https://code.claude.com. You need either a
   Claude Pro/Max subscription or an Anthropic API key. If you have neither, you can still
   follow along; the trainer drives Claude Code on the projector and the finished feature is
   tagged in the repo.
   Test it: `claude --version`
9. **Testery account.** You will receive an invitation to the workshop workspace by email
   after registering. Accept it and make sure you can sign in at https://app.testery.io.

## Nice to have

- `kubectl` is not required. All Kubernetes work runs in GitHub Actions. If you want to poke
  at the cluster during breaks, ask the trainer.
- Familiarity with Git branches and pull requests, and having seen a CI pipeline before.

## On the day

Bring a charger. Sit at a table. Open the repo and https://testcon.testery.academy in a
browser tab before we start at 09:30.
