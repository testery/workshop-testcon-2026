# Workshop home page

Trainer-managed, deployed once by hand (see `docs/trainer/infrastructure.md`). It serves
https://testcon.testery.academy with the links attendees need and a `/register` redirect to
the sign-up form. It also keeps the shared load balancer alive so previews get a URL fast.

```bash
export REGISTER_URL="https://<your HubSpot form url>"
export CERT_ARN="arn:aws:acm:us-east-1:...:certificate/..."
for f in k8s/home/*.yaml; do envsubst < "$f"; echo "---"; done | kubectl apply -f -
```

## Lab steps page

`https://testcon.testery.academy/testcon-2026/notes.html` serves the attendee edition of the lab
steps (the HTML with copy buttons, built from the trainer's notes). It lives in its own
ConfigMap so the manifest above doesn't carry 80 KB of HTML. To publish a new build:

```bash
kubectl -n default create configmap workshop-lab-steps   --from-file=notes.html="TestCon Workshop - Lab Steps - Attendees.html"   --dry-run=client -o yaml | kubectl apply -f -
kubectl -n default rollout restart deploy/workshop-home   # subPath mounts don't pick up changes
```
