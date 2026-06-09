import type {
  LLMProvider,
  ParseRequest,
  ParseResult,
  ChatTurn,
  ChatResponse,
} from "./provider";

export class NullProvider implements LLMProvider {
  readonly available = false;

  async parse(_req: ParseRequest): Promise<ParseResult> {
    return {};
  }

  async chat(_history: ChatTurn[]): Promise<ChatResponse> {
    return { text: "" };
  }
}
