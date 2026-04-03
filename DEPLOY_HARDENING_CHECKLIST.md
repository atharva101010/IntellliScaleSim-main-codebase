# IntelliScaleSim Production Hardening Checklist

Use this checklist before declaring production ready.

## 1) Secrets and Credentials

- [ ] Copy .env.vps.example to .env.vps and rotate every placeholder value.
- [ ] Use a strong JWT secret (minimum 32 random characters).
- [ ] Use a strong PostgreSQL password and avoid dictionary words.
- [ ] Use a strong Grafana admin password and disable default admin/admin.
- [ ] Keep .env.vps out of git and backups that are publicly accessible.
- [ ] Restrict SSH key access to the VPS and disable password login if possible.
- [ ] Rotate credentials after any suspected leak.

## 2) CORS and Application Origin Controls

- [ ] Set CORS_ORIGINS to your real domain only (for example https://your-domain.com).
- [ ] Remove localhost origins from production env values.
- [ ] Confirm frontend API base URL points to HTTPS reverse proxy path (/api).
- [ ] Verify API docs endpoint is intentionally exposed; disable if not needed.

## 3) Exposed Ports and Network Surface

- [ ] Expose only ports 80 and 443 publicly on the VPS.
- [ ] Do not publish PostgreSQL, Redis, backend, Prometheus, or Grafana ports to 0.0.0.0.
- [ ] Ensure firewall allows only 22 (or custom SSH), 80, and 443.
- [ ] Verify with: sudo ss -tulpen and sudo ufw status (or cloud firewall equivalent).
- [ ] Keep Docker services on internal compose network unless explicitly required.

## 4) HTTPS and Reverse Proxy

- [ ] Domain DNS A record points to the VPS public IP before first deploy.
- [ ] Set ACME_EMAIL in .env.vps for certificate issuance and expiry notices.
- [ ] Verify HTTPS certificate is valid and auto-renewing.
- [ ] Enforce HSTS and common security headers at reverse proxy layer.
- [ ] Redirect www to apex domain (or vice versa) to avoid split origins.

## 5) Containers and Runtime Hardening

- [ ] Pin image tags to known versions (avoid :latest in production where possible).
- [ ] Run regular updates: docker compose pull and controlled rolling restart.
- [ ] Keep Docker socket access limited to services that strictly require it.
- [ ] Remove unused containers/images/volumes to reduce attack surface.
- [ ] Keep VPS OS security patches current.

## 6) Data Protection and Recovery

- [ ] Schedule PostgreSQL backups and test restore regularly.
- [ ] Persist volumes on reliable storage and snapshot them periodically.
- [ ] Store backup encryption keys separately from the VPS.
- [ ] Define RPO and RTO targets for your deployment.

## 7) Monitoring and Incident Readiness

- [ ] Confirm health endpoints are reachable through proxy.
- [ ] Configure alerting for service down, CPU spikes, and disk pressure.
- [ ] Track certificate expiration alerts.
- [ ] Keep audit logs and access logs with retention policy.

## 8) Post-Deploy Verification

- [ ] Frontend loads over HTTPS.
- [ ] API requests succeed via /api path over HTTPS.
- [ ] Login, container deploy, autoscaling, and load test workflows all pass.
- [ ] Grafana is reachable at /grafana and requires proper authentication.
