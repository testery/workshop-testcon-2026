# Run of show

Start 09:30, end 17:15. Breaks are fixed by the organizers: 10:55 to 11:20, 13:00 to 14:00,
15:30 to 15:55. Each break lands on a module boundary.

| Time | Module | Present | Lab | Deck |
| --- | --- | --- | --- | --- |
| 09:30 | 1 Introduction | 40 | 10 + 5 buffer | 01 |
| 10:25 | 2 Branching strategies | 18 | 10 | 02 |
| 10:55 | Break | | | |
| 11:20 | 3 Deploying ephemeral environments | 55 | 15 (3a) + 10 (3b) + buffer | 03 |
| 13:00 | Lunch | | | |
| 14:00 | 4 Test data | 32 | 15 | 04 |
| 14:50 | 5 Creating automated tests | 25 | 12 | 05 |
| 15:30 | Break | | | |
| 15:55 | 6 Adding tests to CI/CD | 28 | 15 | 06 |
| 16:40 | 7 AI-driven development | 18 | 15 | 07 |
| 17:15 | End | | | |

## Have open before you start

- Deck 01 on the projector, `https://testcon.testery.academy` in a tab (the QR and the links).
- GitHub: the repo, your demo PR, the Actions tab.
- Testery workspace, Test Runs page.
- Terminal with `kubectl` on the cluster: `kubectl get ns -l workshop.testery.io/preview=true`
  is the "look at all your environments" moment in Module 3.
- Claude Code in a second terminal on the demo branch, plugin installed.

## During labs

Walk the room. The three things that go wrong: (1) they are on `main` instead of their
branch, (2) YAML indentation in the workflow, (3) branch names with characters that do not
survive becoming a hostname. `scripts/catchup.sh N` fixes all three in one line; say it out
loud at the start of every lab.

Watch the cluster during Lab 3a: `kubectl get pods -A --watch`. Thirty PRs deploying at once
means 90 Fargate pods starting in the same minute. Expect 4 to 6 minutes for the first wave.

## Fallbacks

- Wi-fi dies: play the recorded pipeline run; attendees keep reading the docs and the
  manifests; resume labs when it is back. Labs are all asynchronous, nothing is lost.
- Cluster trouble: `kubectl -n kube-system logs deploy/aws-load-balancer-controller` first.
  Nine times out of ten it is the ALB not having picked up a new host yet; wait.
- Testery trouble: the e2e step can be run from a laptop with the same commands; show that.
- Claude Code misbehaves in Module 7: switch to the second PR (`module-07-complete`) and
  narrate what it did; attendees `scripts/catchup.sh 7`.

## Capture

The registration form gates the repo invite, so by 09:30 everyone in the room is in HubSpot.
At the end of Module 7 the last slide repeats the QR: ask them to book a 30-minute follow-up
if they want help doing this at their company. Note names who asked the hard questions.
