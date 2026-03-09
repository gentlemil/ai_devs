export const extractResponseText = (data) => {
  // Chat Completions format (used by OpenRouter)
  const chatContent = data?.choices?.[0]?.message?.content;
  if (chatContent !== undefined) {
    return chatContent ?? "";
  }

  // Responses API format (used by OpenAI)
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const messages = Array.isArray(data?.output)
    ? data.output.filter((item) => item?.type === "message")
    : [];

  const textPart = messages
    .flatMap((message) =>
      Array.isArray(message?.content) ? message.content : [],
    )
    .find(
      (part) => part?.type === "output_text" && typeof part?.text === "string",
    );

  return textPart?.text ?? "";
};

export const toMessage = (role, content) => ({
  type: "message",
  role,
  content,
});
