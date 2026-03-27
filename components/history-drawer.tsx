"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, X, Trash2, FileJson, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface HistoryItem {
  id: string
  name: string
  data: string
  timestamp: number
}

interface HistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  history: HistoryItem[]
  onSelect: (item: HistoryItem) => void
  onClearHistory: () => void
}

export function HistoryDrawer({ 
  isOpen, 
  onClose, 
  history, 
  onSelect, 
  onClearHistory 
}: HistoryDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 cursor-pointer"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-primary/10 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Recent Sessions</h2>
                  <p className="text-[10px] text-muted-foreground font-medium">Your last 10 successful formats</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="rounded-full hover:bg-primary/5"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Separator className="bg-primary/5" />

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                  <div className="p-4 rounded-full bg-primary/5">
                    <FileJson className="w-8 h-8 text-primary/40" />
                  </div>
                  <p className="text-xs font-medium italic">No history yet. Try formatting some JSON!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className="group relative p-4 rounded-xl bg-primary/[0.02] border border-primary/5 hover:border-primary/20 hover:bg-primary/[0.04] transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        onSelect(item)
                        onClose()
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-xs font-bold truncate pr-6">{item.name}</h4>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {item.data.length > 50 ? `${item.data.substring(0, 50)}...` : item.data}
                          </p>
                          <p className="text-[9px] text-muted-foreground/50 font-medium">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors mt-1" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4">
              {history.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-primary/10 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 text-[11px] font-bold h-10 transition-all duration-300"
                  onClick={onClearHistory}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All History
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
