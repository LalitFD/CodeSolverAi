export type ChatRole = "user" | "assistant";

export type ChatImage = {
  mimeType: string;
  data: string;
  name: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  image?: ChatImage;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};
