# Current DevSecOps / Supply-Chain References

Use these as starting points, then verify current docs/advisories during an actual review because supply-chain attack patterns change quickly.

Last refreshed: 2026-06-15.

## Authoritative frameworks and guidance

- SLSA — Supply-chain Levels for Software Artifacts: artifact integrity, provenance, tamper resistance, build requirements. https://slsa.dev/
- SLSA build requirements draft: producer/build-platform responsibilities for secure artifact production. https://slsa.dev/spec/draft/build-requirements
- OpenSSF S2C2F framework: dependency governance, provenance verification, SBOM validation, rebuilding/signing controls. https://github.com/ossf/s2c2f/blob/main/specification/framework.md
- OpenSSF package-manager best practices, including npm guidance: reproducible installs through vendoring or hash-pinned lockfiles. https://github.com/ossf/package-manager-best-practices
- GitHub Actions secure use reference: least privilege for `GITHUB_TOKEN`, secrets handling, script injection risk, OIDC, untrusted input. https://docs.github.com/en/actions/reference/security/secure-use
- CD Foundation CI/CD Cybersecurity Guide / SSDF Protect the Software: protect source/dependencies, sign artifacts, record provenance, verify before promotion. https://cybersecurity.cd.foundation/docs/phase-2/ssdf/ssdf-ps/
- AWS well-architected software supply-chain security guidance: temporary credentials, least privilege, audit/rotation for long-lived credentials. https://aws.amazon.com/blogs/security/well-architected-best-practices-for-software-supply-chain-security/
- Docker supply-chain guidance: trusted minimal base images, pin by digest, provenance attestations, SBOMs, vulnerability analysis, registry/pipeline policies. https://www.docker.com/blog/software-supply-chain-security-best-practices/
- pnpm supply-chain security guidance: reduce install-time script risk and dependency compromise blast radius. https://pnpm.io/supply-chain-security

## 2026 incident-driven lessons to keep in mind

- SLSA/provenance helps artifact integrity but does not replace CI workflow hardening. Unsafe triggers, broad workflow permissions, exposed secrets, or privileged jobs processing untrusted code can still be exploitable.
- Hash-pinned dependencies and frozen lockfile installs reduce silent substitution and compromised-release drift, but do not prove the package is benign. Pair with review, vulnerability/malware signals, provenance when available, and controlled update flows.
- Pinning third-party CI actions/plugins by immutable commit SHA or digest prevents mutable tag repointing. Balance this with automated update PRs so pins do not become stale.
- Prefer short-lived OIDC-federated credentials over static cloud/provider secrets in CI/CD.
- Treat install scripts, code generation, build plugins, Git dependencies, and vendored code as privileged execution paths.

## Stack-aware package manager examples

Use examples only when the stack matches:

- npm: committed `package-lock.json`/`npm-shrinkwrap.json`, `npm ci`, review `integrity` fields, consider `ignore-scripts` or script allowlists for untrusted contexts.
- pnpm: committed `pnpm-lock.yaml`, `pnpm install --frozen-lockfile`, review pnpm supply-chain hardening options such as build script approval controls where applicable.
- Yarn Berry: committed lockfile and `.yarnrc.yml`, `yarn install --immutable` / immutable cache where appropriate.
- Python pip: pinned versions; `--require-hashes` for high-control requirements workflows where maintainable; review index URLs and extra indexes.
- Poetry/uv/Pipenv: committed lockfile and frozen/sync install mode; use hash-enforcing mode if supported and practical.
- Go: committed `go.mod` and `go.sum`, `go mod verify`, controlled `GONOSUMDB`/private module settings.
- Rust: committed `Cargo.lock` for applications, `cargo build --locked`, audit cargo config and build scripts.
- Java/Gradle/Maven: dependency locking or verification metadata where available; controlled repositories and plugin versions.
- Containers: pin base images by digest for release builds; scan images; generate SBOM; sign images with Sigstore/cosign or equivalent when appropriate.
