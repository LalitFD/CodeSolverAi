"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Button } from "@/components/ui/button";

type CodeBlockProps = {
  className?: string;
  children: string;
};

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className ?? "");
  const language = match?.[1] ?? "text";
  const code = children.replace(/\n$/, "");

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="my-4 max-w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs text-zinc-400">{language}</span>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-zinc-300" onClick={copy}>
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copied ? "Copied" : "Copy Code"}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: "transparent",
          fontSize: "0.82rem",
          overflowX: "auto",
        }}
        wrapLongLines
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
