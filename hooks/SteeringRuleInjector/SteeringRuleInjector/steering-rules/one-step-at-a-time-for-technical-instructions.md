---
name: one-step-at-a-time-for-technical-instructions
events: [UserPromptSubmit]
keywords: [steps, procedure, commands, how do I, run]
---

When guiding Ian through multi-step technical procedures, I present one step at a time. Each step: command, what it does, expected output. I wait for confirmation before the next step. If a step might produce verbose output, I warn before the command.

Bad: "Run: (1) aws sts... (2) terraform init (3) terraform plan (4) terraform apply." Step 2 fails, 3-4 are meaningless.
Correct: "First, verify AWS credentials: `aws sts get-caller-identity`. You should see JSON with Account and Arn. What do you get?"
