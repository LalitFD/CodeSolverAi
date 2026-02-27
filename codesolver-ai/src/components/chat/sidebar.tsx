"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatSession } from "@/types/chat";
import { cn } from "@/lib/utils";

type SidebarProps = {
  chats: ChatSession[];
  activeChatId: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onClearAllChats: () => void;
};

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onClearAllChats,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-300 bg-slate-100/70 dark:border-zinc-800 dark:bg-zinc-950 md:w-80">
      <div className="space-y-3 border-b border-slate-300 p-3 dark:border-zinc-800">
        <Button
          type="button"
          className="w-full justify-start gap-2 rounded-xl bg-blue-600 hover:bg-blue-500"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-900"
          onClick={onClearAllChats}
        >
          <Trash2 className="h-4 w-4" />
          Clear Chats
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1.5">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                "border border-transparent",
                activeChatId === chat.id
                  ? "border-slate-300 bg-white text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900/70 dark:hover:text-zinc-200",
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="line-clamp-1">{chat.title || "New Chat"}</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
