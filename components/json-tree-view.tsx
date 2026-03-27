"use client"

import * as React from "react"
import { useState } from "react"
import { ChevronRight, ChevronDown, Copy, Hash, Quote, Braces, List, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { copyToClipboard, isStringifiedJson } from "@/lib/json-utils"
import { toast } from "sonner"

interface JsonTreeViewProps {
  data: any;
  depth?: number;
  name?: string;
  isLast?: boolean;
  path?: string;
  onHoverPath?: (path: string) => void;
  searchTerm?: string;
}

export function JsonTreeView({ 
  data, 
  depth = 0, 
  name, 
  isLast = true, 
  path = "", 
  onHoverPath,
  searchTerm = ""
}: JsonTreeViewProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isNestedExpanded, setIsNestedExpanded] = useState(false)
  const isObject = data !== null && typeof data === "object"
  const isArray = Array.isArray(data)
  const hasChildren = isObject && Object.keys(data).length > 0

  const toggleOpen = () => setIsOpen(!isOpen)

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation()
    copyToClipboard(path || "root")
    toast.success("Path copied", { description: path || "root" })
  }

  const renderValue = (val: any) => {
    if (val === null) return <span className="text-rose-400 italic font-mono">null</span>
    if (typeof val === "boolean") return <span className="text-indigo-400 font-bold font-mono">{String(val)}</span>
    if (typeof val === "number") return <span className="text-emerald-400 font-mono">{val}</span>
    if (typeof val === "string") return <span className="text-amber-300 font-mono break-all group-hover:text-amber-200 transition-colors">"{val}"</span>
    return null
  }

  const highlightMatch = (text: string) => {
    if (!searchTerm || !text.toLowerCase().includes(searchTerm.toLowerCase())) return text
    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"))
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={i} className="bg-primary/30 text-primary-foreground rounded-sm px-0.5">{part}</mark>
          ) : part
        )}
      </>
    )
  }

  const isStringified = isStringifiedJson(data)

  if (isNestedExpanded && isStringified) {
    try {
      const parsed = JSON.parse(data)
      return (
        <JsonTreeView 
          data={parsed}
          depth={depth}
          name={name}
          isLast={isLast}
          path={path}
          onHoverPath={onHoverPath}
          searchTerm={searchTerm}
        />
      )
    } catch (e) {
      setIsNestedExpanded(false)
    }
  }

  return (
    <div 
      className={cn(
        "group select-none",
        depth === 0 ? "pl-4" : "pl-6 border-l border-primary/5 ml-1 my-0.5"
      )}
      onMouseEnter={() => onHoverPath?.(path)}
    >
      <div className="flex items-start gap-1 py-0.5 group/line">
        {hasChildren && (
          <button 
            onClick={toggleOpen}
            className="mt-1 p-0.5 rounded-md hover:bg-primary/10 text-muted-foreground/40 hover:text-primary transition-all duration-200 focus:outline-none"
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
        
        {!hasChildren && <div className="w-4.5" />}

        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {name && (
            <span className="flex items-center gap-1 text-sky-400 font-bold group-hover:text-sky-300 transition-colors">
              {highlightMatch(name)}:
            </span>
          )}

          {!hasChildren ? (
            <div className="flex items-center gap-2">
              {renderValue(data)}
              {!isLast && <span className="text-muted-foreground/30">,</span>}
              <div className="flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={handleCopyPath}
                  className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground/40 hover:text-primary transition-all duration-200"
                  title="Copy JSON Path"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {isStringified && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsNestedExpanded(true)
                      toast.success("JSON String Expanded")
                    }}
                    className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200"
                    title="De-stringify JSON"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/40 font-mono text-xs">
                {isArray ? `Array[${Object.keys(data).length}]` : `Object`}
              </span>
              {!isOpen && (
                <span className="px-1.5 py-0.5 rounded-md bg-primary/5 text-[10px] font-bold text-primary/60 animate-in fade-in zoom-in duration-300">
                   {isArray ? "[...]" : "{...}"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {Object.entries(data).map(([key, value], index, arr) => {
              const subPath = isArray 
                ? `${path}[${key}]` 
                : (path ? `${path}.${key}` : key)
              
              return (
                <JsonTreeView 
                  key={key}
                  data={value}
                  depth={depth + 1}
                  name={isArray ? undefined : key}
                  isLast={index === arr.length - 1}
                  path={subPath}
                  onHoverPath={onHoverPath}
                  searchTerm={searchTerm}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
