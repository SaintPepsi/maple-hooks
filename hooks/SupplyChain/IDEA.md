# Supply Chain

> Detect known indicators of compromise from dependency supply-chain attacks before they spread further.

## Problem

A compromised package in a dependency tree can execute arbitrary code the moment it's installed, drop persistent malware, and rewrite local tool configuration to keep running. Registry-level advisories tell you a package version was bad; they don't tell you whether the compromise already happened on this machine.

## Solution

A group of checks that run at the start of a work session, scanning for the concrete artifacts a known attack leaves behind — bad dependency pins, dropped payload files, injected lifecycle scripts, rewritten tool configs, and persistence mechanisms — using only fast, local, read-only checks against a small, editable dataset of current indicators.

## How It Works

1. At session start, load the current set of known indicators of compromise.
2. Check the local machine and the current project for each indicator category.
3. Surface any hits immediately, with enough detail (path, indicator, severity) to act on.
4. Treat any read error as "no finding" rather than failing the session.

## Signals

- **Input:** Session start event
- **Output:** Silent when clean; a structured warning with instructions to pause and investigate when indicators are found
