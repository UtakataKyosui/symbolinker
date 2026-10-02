export type CommandResult<T, E = string> =
  | { status: "ok"; data: T }
  | { status: "error"; error: E };

export class AgentApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentApiError";
  }
}

export function unwrapResult<T>(result: CommandResult<T>): T {
  if (result.status === "error") throw new AgentApiError(result.error);
  return result.data;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
