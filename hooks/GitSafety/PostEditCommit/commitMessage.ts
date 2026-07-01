import { basename } from "node:path";

export function commitMessage(rel: string): string {
  return `identity: edit ${basename(rel)}`;
}
