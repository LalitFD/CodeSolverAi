"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/chat/code-block";
import { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: ChatMessage;
};

function isCodeHeavyMessage(content: string) {
  if (content.includes("```")) return true;
  const newlineCount = (content.match(/\n/g) ?? []).length;
  const codeSignals = /[{}()[\];<>]|=>|function |const |let |class /;
  return newlineCount >= 3 && codeSignals.test(content);
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const codeHeavy = isCodeHeavyMessage(message.content);
  const imageSource = message.image
    ? `data:${message.image.mimeType};base64,${message.image.data}`
    : null;

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-2xl px-4 py-3 break-words",
          codeHeavy ? "max-w-[96%] md:max-w-[92%]" : "max-w-[92%] md:max-w-[80%]",
          isUser && !codeHeavy ? "bg-blue-600 text-white" : "bg-white text-slate-900 dark:bg-zinc-900 dark:text-zinc-100",
          isUser && codeHeavy && "border border-slate-300 dark:border-zinc-700",
        )}
      >
        {imageSource && (
          <img
            src={imageSource}
            alt={message.image?.name ?? "Uploaded image"}
            className="mb-3 max-h-64 w-full rounded-lg object-contain"
          />
        )}
        {isUser && codeHeavy && !message.content.includes("```") ? (
          <pre className="overflow-x-auto whitespace-pre p-0 text-xs leading-6 text-slate-900 dark:text-zinc-100">
            <code>{message.content}</code>
          </pre>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const raw = String(children);
                const isInline = !className;

                if (isInline) {
                  return (
                    <code className="rounded bg-slate-200 px-1 py-0.5 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100" {...props}>
                      {children}
                    </code>
                  );
                }

                return <CodeBlock className={className}>{raw}</CodeBlock>;
              },
              p({ children }) {
                return <p className="leading-7 [&:not(:last-child)]:mb-3">{children}</p>;
              },
              ul({ children }) {
                return <ul className="mb-3 list-disc pl-5">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="mb-3 list-decimal pl-5">{children}</ol>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
