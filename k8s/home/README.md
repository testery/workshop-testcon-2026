# Workshop home page

Trainer-managed, deployed once by hand (see `docs/trainer/infrastructure.md`). It serves
https://testcon.testery.academy with the links attendees need and a `/register` redirect to
the sign-up form. It also keeps the shared load balancer alive so previews get a URL fast.

```bash
export REGISTER_URL="https://<your HubSpot form url>"
export CERT_ARN="arn:aws:acm:us-east-1:...:certificate/..."
for f in k8s/home/*.yaml; do envsubst < "$f"; echo "---"; done | kubectl apply -f -
```
