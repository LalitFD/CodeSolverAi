"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Menu, Moon, Sparkles, Sun, X } from "lucide-react";

import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Sidebar } from "@/components/chat/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createId } from "@/lib/utils";
import { ChatImage, ChatMessage, ChatSession } from "@/types/chat";

function createEmptyChat(): ChatSession {
  const now = Date.now();
  return {
    id: createId(),
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function deriveTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "New Chat";
  const firstText = firstUserMessage.content.trim();
  if (firstText) return firstText.slice(0, 50);
  return firstUserMessage.image ? `Image: ${firstUserMessage.image.name}` : "New Chat";
}

export function ChatApp() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [input, setInput] = useState("");
  const [inputImage, setInputImage] = useState<ChatImage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? chats[0],
    [activeChatId, chats],
  );

  useEffect(() => {
    const initialChat = createEmptyChat();
    setChats([initialChat]);
    setActiveChatId(initialChat.id);
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;
    if (!viewport) return;

    const handleScroll = () => {
      const threshold = 96;
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom <= threshold;
    };

    handleScroll();
    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;
    if (!viewport || !shouldAutoScrollRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [activeChat?.messages, isStreaming]);

  const upsertChat = (chatId: string, updater: (chat: ChatSession) => ChatSession) => {
    setChats((current) => current.map((chat) => (chat.id === chatId ? updater(chat) : chat)));
  };

  const startNewChat = () => {
    const chat = createEmptyChat();
    setChats((current) => [chat, ...current]);
    setActiveChatId(chat.id);
    setInput("");
    setInputImage(null);
    setSidebarOpen(false);
    setErrorMessage("");
  };

  const clearAllChats = () => {
    const chat = createEmptyChat();
    setChats([chat]);
    setActiveChatId(chat.id);
    setInput("");
    setInputImage(null);
    setErrorMessage("");
    setSidebarOpen(false);
  };

  const clearCurrentChat = () => {
    if (!activeChat) return;
    upsertChat(activeChat.id, (chat) => ({
      ...chat,
      messages: [],
      title: "New Chat",
      updatedAt: Date.now(),
    }));
    setErrorMessage("");
    setInputImage(null);
  };

  const onImageSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Only image files are supported.");
      return;
    }

    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setErrorMessage("Image too large. Please upload an image smaller than 10MB.");
      return;
    }

    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          const [, base64 = ""] = result.split(",");
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read image."));
        reader.readAsDataURL(file);
      });

      if (!data) {
        setErrorMessage("Failed to process image.");
        return;
      }

      setInputImage({
        mimeType: file.type,
        data,
        name: file.name,
      });
      setErrorMessage("");
    } catch (error) {
      console.error("Image upload failed:", error);
      setErrorMessage("Failed to upload image.");
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !inputImage) || isStreaming || !activeChat) return;

    setErrorMessage("");
    setInput("");
    const selectedImage = inputImage;
    setInputImage(null);
    setIsStreaming(true);

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
      image: selectedImage ?? undefined,
    };
    const assistantMessage: ChatMessage = { id: createId(), role: "assistant", content: "" };
    const nextMessages = [...activeChat.messages, userMessage, assistantMessage];

    upsertChat(activeChat.id, (chat) => ({
      ...chat,
      messages: nextMessages,
      title: deriveTitle(nextMessages),
      updatedAt: Date.now(),
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
            image: message.image,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        const fallback = "Failed to stream response from API.";
        setErrorMessage(fallback);
        upsertChat(activeChat.id, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) =>
            message.id === assistantMessage.id ? { ...message, content: fallback } : message,
          ),
          updatedAt: Date.now(),
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullAssistantText = "";

      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;

        if (chunk.value) {
          fullAssistantText += decoder.decode(chunk.value, { stream: true });
          upsertChat(activeChat.id, (chat) => ({
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: fullAssistantText }
                : message,
            ),
            updatedAt: Date.now(),
          }));
        }
      }
    } catch (error) {
      console.error("Streaming failed:", error);
      const fallback = "Something went wrong while generating a response.";
      setErrorMessage(fallback);
      upsertChat(activeChat.id, (chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.id === assistantMessage.id ? { ...message, content: fallback } : message,
        ),
        updatedAt: Date.now(),
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          chats={chats}
          activeChatId={activeChat?.id ?? ""}
          onSelectChat={(chatId) => {
            setActiveChatId(chatId);
            setSidebarOpen(false);
          }}
          onNewChat={startNewChat}
          onClearAllChats={clearAllChats}
        />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <div className="z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-300/80 bg-slate-100/85 px-3 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen((value) => !value)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <h1 className="text-lg font-semibold tracking-tight">CodeSolver AI</h1>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-slate-300 bg-white/80 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="border-zinc-700 bg-transparent" onClick={startNewChat}>
              New Chat
            </Button>
            <Button type="button" variant="ghost" className="text-zinc-300" onClick={clearCurrentChat}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Chat
            </Button>
          </div> */}
        </header>

        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 px-3 py-4 md:px-6">
          <div className="mx-auto w-full min-w-0 max-w-4xl space-y-4">
            {!activeChat?.messages.length && (
              <div className="rounded-2xl border border-slate-300 bg-white/80 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <Bot className="mx-auto mb-3 h-10 w-10 text-slate-500 dark:text-zinc-400" />
                <h2 className="text-xl font-semibold">Start solving any coding problem</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                  Ask for production-ready code, bug fixes, architecture help, or DSA solutions.
                </p>
              </div>
            )}

            {activeChat?.messages.map((message) => <MessageBubble key={message.id} message={message} />)}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500 [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500 [animation-delay:220ms]" />
                  Thinking...
                </div>
              </div>
            )}
            {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
          </div>
        </ScrollArea>

        <ChatInput
          value={input}
          onChange={setInput}
          image={inputImage}
          onImageSelect={onImageSelect}
          onRemoveImage={() => setInputImage(null)}
          onSubmit={sendMessage}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}
