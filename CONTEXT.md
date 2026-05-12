# Dotfiles Domain Context

This repository manages a Linux development environment through a few load-bearing concepts:

## Installer setup plan

An **installer setup plan** maps a top-level installer menu option to the ordered setup scripts that should run. Plans preserve the existing `install.sh` menu while making ordering, dry-run validation, logging, and failure behavior explicit.

## Dotfiles installation manifest

A **dotfiles installation manifest** is the auditable list of source-to-destination rules used to install config files. Manifest entries describe directory creation, file copies, directory copies, symlinks, executable bits, and idempotent install behavior without requiring a real home directory during tests.

## Theme orchestration

**Theme orchestration** owns supported theme names, current-theme persistence, first-install theme initialization, runtime theme switching, component-specific theme actions, generated settings, symlinks, and reload actions. Runtime switching and first-install defaults should use the same orchestration path.

## Hacktools inventory

A **hacktools inventory** is the structured definition of bug bounty tools, ProjectDiscovery tools, Go installs, Python installs, repository installs, wordlists, required paths, and post-install actions. Inventory planning must be inspectable without installing external tools.

## Recon workspace pipeline

A **recon workspace pipeline** is the explicit set of recon stages, their required input files, produced output files, and shared scan helpers. Existing shell function names remain the user-facing interface, while stage contracts make missing workspace artifacts easier to diagnose.

## Shell runtime bootstrap

**Shell runtime bootstrap** is the shell startup behavior needed for interactive use: path composition, completions, runtime config, and theme reload compatibility. Install-time plugin/tool setup should stay outside normal shell startup.

## Mongo recon store

A **Mongo recon store** is the persistence boundary for recon data. CLI commands adapt user input to store operations, while parsing, duplicate detection, listing, deletion, and persistence are testable through Mongo-backed and in-memory adapters.
