interface PromptParams {
  systemPrompt?: string | null;
  userPrompt: string;
}

const BuildChatPromptService = ({
  systemPrompt,
  userPrompt
}: PromptParams): { role: string; content: string }[] => {
  const messages = [] as { role: string; content: string }[];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: userPrompt });

  return messages;
};

export default BuildChatPromptService;
