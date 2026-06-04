# Judge0 host preparation (Ubuntu 22.04)

Judge0 1.13.1 sandboxes code with **isolate**, which requires **cgroup v1**. Ubuntu 22.04
defaults to cgroup v2, so the host kernel must be switched **before** Judge0 will report
correct time/memory or run reliably. This is the #1 self-hosting failure — do it first.

## 1. Switch the host to cgroup v1

Edit `/etc/default/grub` and append to `GRUB_CMDLINE_LINUX`:

```
systemd.unified_cgroup_hierarchy=0
```

So it reads e.g.:

```
GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0"
```

Then:

```bash
sudo update-grub
sudo reboot
```

Verify after reboot (should print `tmpfs` / show the v1 hierarchy, not a single `cgroup2fs`):

```bash
stat -fc %T /sys/fs/cgroup/
# expect: tmpfs   (cgroup v1)   — NOT: cgroup2fs (v2)
```

## 2. Required Docker capabilities

The `judge0-server` and `judge0-workers` services run `privileged: true` (see
`infra/docker-compose.yml`). Some managed/container hosts forbid privileged containers — if so,
Judge0 cannot self-host there; use a plain VM (Hetzner / DigitalOcean droplet / bare EC2).

## 3. Bring it up

```bash
cd infra
docker compose up -d judge0-db judge0-redis
sleep 10
docker compose up -d judge0-server judge0-workers
curl http://localhost:2358/system_info   # sanity check
```

## 4. Validate sandboxing (do this in milestone M2, on the real VPS)

Submit code that tries to open a socket and confirm it fails, and submit a busy loop and
confirm it's killed at the CPU limit. The grader's `/health` endpoint runs a canary submission
for exactly this purpose.
