"use client";

import { ChangeEvent, ClipboardEvent, KeyboardEvent, useEffect, useRef } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatImage } from "@/types/chat";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  image: ChatImage | null;
  onImageSelect: (file: File) => void;
  onRemoveImage: () => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function ChatInput({
  value,
  onChange,
  image,
  onImageSelect,
  onRemoveImage,
  onSubmit,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const maxHeight = 160;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImageSelect(file);
    event.target.value = "";
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    onImageSelect(file);
  };

  return (
    <div className="border-t border-slate-300/80 bg-slate-100/85 px-3 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 md:px-6">
      <div className="mx-auto w-full min-w-0 max-w-4xl rounded-xl border border-slate-300 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
        {image && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800">
            <img
              src={`data:${image.mimeType};base64,${image.data}`}
              alt={image.name}
              className="h-12 w-12 rounded-md object-cover"
            />
            <span className="max-w-40 truncate text-xs text-slate-600 dark:text-zinc-300">{image.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={onRemoveImage}
              disabled={disabled}
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-slate-300 bg-white hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Upload image"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Ask CodeSolver AI anything about code..."
          rows={1}
          className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={disabled || (!value.trim() && !image)}
          className="h-10 shrink-0 rounded-lg bg-blue-600 px-4 hover:bg-blue-500"
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-4xl px-1 text-xs text-slate-500 dark:text-zinc-500">
        Upload or paste an image, then ask your question. Press Enter to send, Shift+Enter for a new line.
      </p>
    </div>
  );
}
