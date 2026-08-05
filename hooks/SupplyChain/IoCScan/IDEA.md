# IoC Scan

> Catch known npm supply-chain attack artifacts on disk before an install command can spread them further.

## Problem

npm supply-chain attacks compromise popular packages by injecting a malicious lifecycle script (e.g. `preinstall`) that runs automatically on install. The script drops payload files, harvests credentials, and installs a persistence mechanism (a background service or scheduled agent) so it survives beyond the initial install. Once a machine is compromised, every subsequent `npm install` in every project on that machine is a chance for the malware to re-spread or re-activate. Most tooling only checks package registries for known-bad versions before install; nothing checks whether the compromise has already happened, locally, before the next session even opens a terminal.

## Solution

On every session start, scan for the specific artifacts a known attack leaves behind: pinned bad-version dependencies in lockfiles, dropped payload files, injected lifecycle scripts already present in `node_modules`, tool-config or editor-config files rewritten to add malicious hooks, and persistence scripts or services installed under the user's home directory. All of this is fast, local, and read-only — no network calls, no package registry lookups. Findings are surfaced immediately, before any install command runs, with an explicit instruction not to run installs and to isolate and investigate.

The set of known-bad versions, payload filenames, and persistence paths is kept as a small data file separate from the scanning logic, so responding to a new advisory is an edit to that data, not a code change.

## How It Works

1. On session start, check whether the scan is enabled (default: yes).
2. Load the current IoC dataset: known-bad package versions, payload filenames, a regex for the malicious lifecycle-script pattern, and known persistence artifact paths.
3. Check the user's home directory for known persistence artifacts (scripts, services, scheduled agents). Any match is critical — it means a prior compromise happened on this machine, independent of the current project.
4. Check the current project's lockfiles for any known-bad package pinned to a known-bad version.
5. Check editor and tool config files in the current project for injected hooks referencing payload filenames or persistence tooling.
6. Scan installed dependency manifests (capped, for performance) for the malicious lifecycle-script pattern and for payload files sitting alongside them. A lifecycle-script match alone is a possible false positive; a lifecycle-script match plus a payload file together is a strong signal.
7. If anything was found, report it clearly and tell the assistant to warn the user and avoid running any install.
8. Any read failure (missing file, permission error, bad path) is treated as "no finding" rather than crashing — a security scanner must never be the reason a session fails to start.

## Signals

- **Input:** Session start event, with the current working directory
- **Output:** Silent on a clean scan; on a hit, a structured warning naming each finding, its severity, and the path where it was found, plus an instruction not to run installs until the user has investigated
