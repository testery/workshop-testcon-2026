# Setup checklist (before 20 October)

Items marked **(Chris)** need an account only Chris has.

## GitHub (`testery/workshop-testcon-2026`)

- [x] Repo created, `main` protected (PR required, `CI` status required, no force push).
- [x] Repository variables: `AWS_ROLE_ARN`, `ECR_REGISTRY`, `EKS_CLUSTER`, `PREVIEW_DOMAIN`,
      `PREVIEW_CERT_ARN`, `TESTERY_PROJECT_KEY`.
- [ ] **(Chris)** Repository secret `TESTERY_TOKEN`: an API token from the **workshop**
      Testery workspace (Settings > API tokens). The one in there now belongs to the Testery
      internal account and was used to validate the pipeline; replace it.
- [ ] **(Chris)** Invite attendees as collaborators with **Write** access as registrations
      arrive. GitHub Settings > Collaborators > Add people. Write access is required so their
      PR workflows get the repo variables and the OIDC role.
- [ ] Tags `module-02-complete` ... `module-07-complete` pushed (done; re-push if you change
      solutions).

## Testery

- [ ] **(Chris)** Create the workshop workspace: sign up at https://app.testery.io with
      `chris.harbert+testcon2026@testery.io` (a fresh account, not the Testery internal one,
      so attendees only see workshop runs). Name it **TestCon 2026 Workshop**.
- [ ] **(Chris)** In it, create project key `workshop-testcon-2026`, framework Playwright,
      config file `playwright.config.ts`. Or POST the JSON in `infrastructure.md`.
- [ ] **(Chris)** Generate an API token there and put it in the GitHub secret `TESTERY_TOKEN`.
- [ ] **(Chris)** Invite attendees to the workspace as registrations arrive.
- [ ] Re-run a PR end to end after the token swap to confirm runs land in the new workspace.

## Registration / attendee capture

- [ ] **(Chris)** Create a HubSpot form "TestCon 2026 Workshop registration" with fields
      First name, Last name, Email, Company, GitHub username (single-line text, custom
      property `github_username`), and the consent checkbox. Use the form's share link.
- [ ] Put the share link into the home page redirect:
      `REGISTER_URL="https://share.hsforms.com/..." CERT_ARN=... bash` the command in
      `k8s/home/README.md`. `https://testcon.testery.academy/register` then redirects there.
      The QR code on the slides points at the `/register` URL, so the slides never change.
- [ ] **(Chris)** HubSpot workflow: on form submission, add to the static list
      "TestCon 2026 Workshop" and notify chris.harbert@testery.io, so invites go out same day.
- [ ] Send the prerequisites email (`docs/00-prerequisites.md`, also in the Drive folder as
      "Attendee Prerequisites Email.md") 10 days before and again 2 days before.

## Slides and demo

- [ ] Decks 01 to 07 in the Drive folder; PDFs exported next to them.
- [ ] Demo branch `chris/demo` with an open PR at `module-06-complete` state, preview up, for
      live use. Second PR at `module-07-complete` as the fallback if Claude Code misbehaves.
- [ ] Recording of a full pipeline run (build, deploy, Testery run) as the wi-fi fallback.
- [ ] `kubectl` configured on the trainer laptop (`aws eks update-kubeconfig --name workshop-testcon-2026`).

## After the workshop

- [ ] Run `docs/trainer/infrastructure.md` > Teardown (cluster, ALB, ECR images, DNS, cert).
- [ ] Export the HubSpot list to the follow-up sequence.
- [ ] Remove attendee collaborators from the repo (or make the repo public without secrets).
