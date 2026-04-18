#!/usr/bin/env bun
import { runHook } from "@hooks/core/runner";
import { DefaultEffort } from "@hooks/hooks/SessionFraming/DefaultEffort/DefaultEffort.contract";

runHook(DefaultEffort);
