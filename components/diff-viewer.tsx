"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus, Equal, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { JsonDiffEntry } from "@/lib/json-utils"

interface DiffViewerProps {
  diffs: JsonDiffEntry[]
  searchTerm?: string
}

const renderHighlightedText = (text: string, searchTerm?: string) => {
  if (!searchTerm) return text;
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.toLowerCase() === searchTerm.toLowerCase()
              ? "bg-yellow-300/30 text-yellow-200 rounded px-0.5"
              : ""
          }
        >
          {part}
        </span>
      ))}
    </>
  );
};

export function DiffViewer({ diffs, searchTerm }: DiffViewerProps) {
  if (diffs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
        <Equal className="w-12 h-12 mb-4 text-primary/40" />
        <h3 className="text-lg font-bold tracking-tight">Identical JSON</h3>
        <p className="text-xs font-medium">No structural differences detected between the two inputs.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto custom-scrollbar font-mono text-[12px] leading-[1.6] p-4">
      <div className="space-y-0.5">
        {diffs.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.01 }}
            style={{ paddingLeft: `${entry.level * 1.5}rem` }}
            className={cn(
              "group flex items-center gap-3 py-1 px-3 rounded-md transition-all duration-200 border-l-4",
              entry.type === "added" && "bg-emerald-500/5 border-emerald-500 text-emerald-400 font-medium",
              entry.type === "removed" && "bg-rose-500/5 border-rose-500 text-rose-400 font-medium line-through decoration-rose-500/50",
              entry.type === "changed" && "bg-amber-500/5 border-amber-500 text-amber-400 font-medium",
              entry.type === "unchanged" && "bg-transparent border-transparent text-muted-foreground/60"
            )}
          >
            <div className="w-4 shrink-0 flex items-center justify-center">
              {entry.type === "added" && <Plus className="w-3 h-3" />}
              {entry.type === "removed" && <Minus className="w-3 h-3" />}
              {entry.type === "changed" && <AlertCircle className="w-3 h-3" />}
            </div>
            
            <span className={cn(
              "font-bold",
              entry.type === "unchanged" ? "text-muted-foreground/40" : "text-inherit"
            )}>
              {renderHighlightedText(entry.key, searchTerm)}:
            </span>

            <span className="truncate">
              {entry.type === "changed" ? (
                <span className="flex items-center gap-2">
                  <span className="opacity-40 italic">{renderHighlightedText(String(entry.oldValue), searchTerm)}</span>
                  <span className="text-primary/40">→</span>
                  <span>{renderHighlightedText(String(entry.value), searchTerm)}</span>
                </span>
              ) : (
                renderHighlightedText(String(entry.value ?? entry.oldValue ?? ""), searchTerm)
              )}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
