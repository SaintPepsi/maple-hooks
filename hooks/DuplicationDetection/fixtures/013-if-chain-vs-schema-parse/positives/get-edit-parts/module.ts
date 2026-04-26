interface ToolHookInput {
  tool_name: string;
  tool_input: Record<string, unknown> | null;
}

export function getEditParts(input: ToolHookInput): { oldStr: string; newStr: string } | null {
  if (typeof input.tool_input !== "object" || input.tool_input === null) return null;
  if (input.tool_name !== "Edit") return null;
  const oldStr = input.tool_input.old_string as string | undefined;
  const newStr = input.tool_input.new_string as string | undefined;
  if (!oldStr || !newStr) return null;
  return { oldStr, newStr };
}
