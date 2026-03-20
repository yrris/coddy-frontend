export type CodeGenType = 'HTML_SINGLE' | 'HTML_MULTI';

export type AiCodeGenerateRequest = {
  prompt: string;
  codeGenType: CodeGenType;
};

export type AiCodeGenerateResponse = {
  codeGenType: CodeGenType;
  outputDir: string;
  files: Record<string, string>;
};
