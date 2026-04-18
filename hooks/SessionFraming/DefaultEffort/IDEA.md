# Default Effort

> Automatically set reasoning depth based on the AI model being used.

## Problem

Different AI models have different reasoning capabilities and costs. Users often want maximum reasoning depth from capable models (like Opus) but lighter reasoning from faster models (like Haiku). Manually setting effort level at the start of every session is tedious and easy to forget.

## Solution

At session start, detect which model is running and inject an effort-level instruction based on a user-defined mapping. The user configures once which models should use which effort levels, and every new session automatically receives the appropriate reasoning depth instruction.

## How It Works

1. At session start, read the model-to-effort mapping from configuration.
2. Detect the current model from environment variables.
3. Look up the configured effort level for that model.
4. Inject a system instruction describing the expected reasoning behavior.
5. If no configuration exists or the model isn't mapped, skip silently.

## Signals

- **Input:** Model-to-effort configuration and current model identifier
- **Output:** A system instruction describing the reasoning depth to use, or nothing
