"use client"

import * as React from "react"
import { useState, useRef } from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { toast } from "sonner"
import { 
  Copy, Trash2, Check, FileJson, AlertCircle, Sparkles, 
  Minimize2, Download, Upload, Info, Target, Zap,
  ChevronDown, Code, FileText, Table, Link, Braces, Pin, Clock, FileCode2, Search,
  ShieldCheck, ChevronRight, ExternalLink, Share2, Globe, Lock, Wrench, Wand2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { HistoryDrawer } from "@/components/history-drawer"
import { DiffViewer } from "@/components/diff-viewer"
import { cn } from "@/lib/utils"
import { 
  JsonError, parseAndFormatJson, validateJson, 
  copyToClipboard, minifyJson, getJsonSize, downloadJsonFile,
  jsonToTypeScript, jsonToYaml, jsonToCsv, jsonToUrlParams,
  computeJsonDiff, JsonDiffEntry, executeQuery
} from "@/lib/json-utils"
import { validateWithSchema, SchemaValidationResult, generateSchemaFromData } from "@/lib/schema-utils"
import { generateMockData } from "@/lib/mock-utils"
import { shareToGist } from "@/lib/gist-utils"
import { JsonOutput } from "@/components/json-output"
import { JsonTreeView } from "@/components/json-tree-view"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4, 
      staggerChildren: 0.05,
      ease: "easeOut"
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
}




interface JsonTab {
  id: string
  title: string
  input: string
  output: string
  diffInput: string
  schemaInput: string
  queryInput: string
  viewMode: 'code' | 'tree' | 'diff'
  lastModified: number
}

const DEFAULT_TAB: JsonTab = {
  id: "default",
  title: "Untitled",
  input: "",
  output: "",
  diffInput: "",
  schemaInput: "",
  queryInput: "",
  viewMode: 'code',
  lastModified: Date.now()
}

export function JsonFormatter() {
  const [tabs, setTabs] = useState<JsonTab[]>([DEFAULT_TAB])
  const [activeTabId, setActiveTabId] = useState<string>("default")
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const [error, setError] = useState<JsonError | null>(null)
  const [copied, setCopied] = useState(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [hoveredPath, setHoveredPath] = useState<string>("")
  const [history, setHistory] = useState<{ id: string; name: string; data: string; timestamp: number }[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isCompareShowing, setIsCompareShowing] = useState(false)
  const [isSchemaShowing, setIsSchemaShowing] = useState(false)
  const [schemaResult, setSchemaResult] = useState<SchemaValidationResult | null>(null)
  const [diffResult, setDiffResult] = useState<JsonDiffEntry[]>([])
  const [isGistDialogOpen, setIsGistDialogOpen] = useState(false)
  const [gistFilename, setGistFilename] = useState("data.json")
  const [gistIsPublic, setGistIsPublic] = useState(true)
  const [gistToken, setGistToken] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [gistUrl, setGistUrl] = useState<string | null>(null)
  const [fetchUrl, setFetchUrl] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Memoized helper to update active tab
  const updateActiveTab = (updates: Partial<JsonTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates, lastModified: Date.now() } : tab
    ))
  }

  // Shorthands for active tab data
  const input = activeTab.input
  const output = activeTab.output
  const diffInput = activeTab.diffInput
  const schemaInput = activeTab.schemaInput
  const queryInput = activeTab.queryInput
  const viewMode = activeTab.viewMode

  // Wrapped setters
  const setInput = (val: string) => updateActiveTab({ input: val })
  const setOutput = (val: string) => updateActiveTab({ output: val })
  const setDiffInput = (val: string) => updateActiveTab({ diffInput: val })
  const setSchemaInput = (val: string) => updateActiveTab({ schemaInput: val })
  const setQueryInput = (val: string) => updateActiveTab({ queryInput: val })
  const setViewMode = (val: 'code' | 'tree' | 'diff') => updateActiveTab({ viewMode: val })

  React.useEffect(() => {
    setMounted(true)
    
    // Load from localStorage
    const savedTabs = localStorage.getItem("json_lens_tabs")
    const savedActiveTabId = localStorage.getItem("json_lens_active_tab_id")
    const savedHistory = localStorage.getItem("json_lens_history")
    
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed)
        }
      } catch (e) {
        // Fallback to legacy migration
        const legacyInput = localStorage.getItem("json_lens_input")
        if (legacyInput) {
          setTabs([{ ...DEFAULT_TAB, input: legacyInput, output: localStorage.getItem("json_lens_output") || "" }])
        }
      }
    } else {
      // Legacy migration check
      const legacyInput = localStorage.getItem("json_lens_input")
      if (legacyInput) {
        setTabs([{ ...DEFAULT_TAB, input: legacyInput, output: localStorage.getItem("json_lens_output") || "" }])
      }
    }

    if (savedActiveTabId) setActiveTabId(savedActiveTabId)
    
    // Initialize Web Worker
    workerRef.current = new Worker('/json-worker.js')
    workerRef.current.onmessage = (e) => {
      const { action, result, error } = e.data
      if (error) {
        toast.error("Worker Error", { description: error })
        setIsFormatting(false)
        return
      }
      
      if (action === 'format') {
        setOutput(result)
        setIsFormatting(false)
        const newHistory = {
          id: Math.random().toString(36).substring(2, 9),
          name: tabs.find(t => t.id === activeTabId)?.title || "Untitled",
          data: result,
          timestamp: Date.now()
        }
        setHistory(prev => [newHistory, ...prev].slice(0, 10))
        toast.success("JSON Formatted (Worker)")
      }
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  // Save to localStorage on change
  React.useEffect(() => {
    if (!mounted) return
    localStorage.setItem("json_lens_tabs", JSON.stringify(tabs))
    localStorage.setItem("json_lens_active_tab_id", activeTabId)
  }, [tabs, activeTabId, mounted])

  const handleAddTab = () => {
    const newTab: JsonTab = {
      ...DEFAULT_TAB,
      id: Math.random().toString(36).substring(2, 11),
      title: `Untitled ${tabs.length + 1}`,
      lastModified: Date.now()
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
    toast.success("New Tab Created")
  }

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (tabs.length === 1) {
      handleClear()
      return
    }
    
    const newTabs = tabs.filter(t => t.id !== id)
    setTabs(newTabs)
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    }
    toast.info("Tab Closed")
  }

  const handleRenameTab = (id: string, newTitle: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === id ? { ...tab, title: newTitle || "Untitled" } : tab
    ))
  }

  const handleFormat = () => {
    if (!input.trim()) return
    setIsFormatting(true)
    setError(null)

    // Offload to worker if input is large (> 500k characters)
    if (workerRef.current && input.length > 500000) {
      toast.info("Processing Large JSON...", { description: "Offloading to background worker." })
      workerRef.current.postMessage({ action: 'format', data: input })
      return
    }

    setTimeout(() => {
      const { output: formatted, error: parseError } = parseAndFormatJson(input)
      if (parseError) {
        setError(parseError)
        toast.error("Failed to format JSON", {
          description: parseError.message
        })
      } else {
        setOutput(formatted)
        
        // Add to history
        const newEntry = {
          id: Math.random().toString(36).substring(2, 11),
          name: tabs.find(t => t.id === activeTabId)?.title || "Untitled",
          data: formatted,
          timestamp: Date.now()
        }
        const updatedHistory = [newEntry, ...history].slice(0, 10)
        setHistory(updatedHistory)
        
        toast.success("JSON Formatted", {
          description: "Clean indentation applied successfully."
        })
      }
      setIsFormatting(false)
    }, 400)
  }

  const handleMinify = () => {
    if (!input.trim()) return
    setIsFormatting(true)
    setError(null)

    setTimeout(() => {
      const { output: minified, error: parseError } = minifyJson(input)
      if (parseError) {
        setError(parseError)
        toast.error("Minification failed")
      } else {
        setOutput(minified)
        toast.success("JSON Minified", {
          description: "All unnecessary spaces removed."
        })
      }
      setIsFormatting(false)
    }, 400)
  }

  const handleValidate = () => {
    const { isValid, error: validationError } = validateJson(input)
    if (isValid) {
      setError({ message: "JSON is valid!" })
      toast.success("Validation Passed", { icon: <Zap className="w-4 h-4 text-green-500" /> })
    } else {
      setError(validationError)
      toast.error("Invalid JSON", { description: validationError?.message })
    }
  }

  const handleClear = () => {
    if (!input && !output) return
    setInput("")
    setOutput("")
    setError(null)
    setHoveredPath("")
    localStorage.removeItem("json_lens_input")
    localStorage.removeItem("json_lens_output")
    toast.info("Workspace Cleared")
  }

  const handleSelectHistory = (item: { data: string }) => {
    setInput(item.data)
    setError(null)
    toast.success("Session Restored")
  }

  const handleClearHistory = () => {
    setHistory([])
    localStorage.removeItem("json_lens_history")
    toast.info("History Cleared")
  }

  const handleRunDiff = () => {
    try {
      const obj1 = JSON.parse(input)
      const obj2 = JSON.parse(diffInput)
      const results = computeJsonDiff(obj1, obj2)
      setDiffResult(results)
      setViewMode('diff')
      toast.success("Structural Diff Generated")
    } catch (e: any) {
      toast.error("Invalid input for comparison", { description: e.message })
    }
  }

  const handleSchemaValidate = () => {
    // ...existing code
  }

  const handleAutoGenerateSchema = () => {
    try {
      const data = JSON.parse(input)
      const schema = generateSchemaFromData(data)
      const schemaString = JSON.stringify(schema, null, 2)
      setSchemaInput(schemaString)
      
      // Auto-validate after generation
      const result = validateWithSchema(data, schema)
      setSchemaResult(result)
      
      toast.success("Schema Auto-Generated", {
        description: "Draft 7 schema inferred from current JSON."
      })
    } catch (e: any) {
      toast.error("Generation failed", { description: "Invalid source JSON." })
    }
  }

  const handleGenerateMockData = (count: number) => {
    // ...existing code
  }

  const handleFetch = async () => {
    if (!fetchUrl.trim()) return
    
    setIsFetching(true)
    const toastId = toast.loading("Fetching data...")
    
    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(fetchUrl)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || response.statusText)
      }
      
      const data = await response.json()
      const jsonString = JSON.stringify(data, null, 2)
      setInput(jsonString)
      setOutput(jsonString)
      toast.success("Data Fetched Successfully", { id: toastId })
    } catch (e: any) {
      toast.error("Fetch Failed", { 
        id: toastId,
        description: e.message 
      })
    } finally {
      setIsFetching(false)
    }
  }

  const handleCopy = async () => {
    if (!output) return
    const success = await copyToClipboard(output)
    if (success) {
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyAs = async (type: 'ts' | 'yaml' | 'csv' | 'url') => {
    if (!output) return
    try {
      const parsed = JSON.parse(output)
      let content = ""
      let label = ""

      switch (type) {
        case 'ts':
          content = jsonToTypeScript(parsed)
          label = "TypeScript Interfaces"
          break
        case 'yaml':
          content = jsonToYaml(parsed)
          label = "YAML"
          break
        case 'csv':
          content = jsonToCsv(parsed)
          label = "CSV"
          break
        case 'url':
          content = jsonToUrlParams(parsed)
          label = "URL Query Params"
          break
      }

      const success = await copyToClipboard(content)
      if (success) {
        toast.success(`Copied as ${label}`)
      }
    } catch (e) {
      toast.error("Conversion failed", { description: "Ensure JSON is valid first." })
    }
  }

  const handleDownload = () => {
    if (output) {
      downloadJsonFile(output)
      toast.info("Download Started")
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setInput(content)
      const { output: formatted, error: parseError } = parseAndFormatJson(content)
      setOutput(formatted)
      setError(parseError)
      toast.success(`Loaded ${file.name}`)
    }
    reader.onerror = () => toast.error("File upload failed")
    reader.readAsText(file)
  }

  const handleShare = async () => {
    if (!output) return
    setIsSharing(true)
    const result = await shareToGist(output, gistFilename, gistIsPublic, gistToken)
    setIsSharing(false)
    
    if (result.error) {
      toast.error("Sharing failed", { description: result.error })
    } else if (result.url) {
      setGistUrl(result.url)
      toast.success("Gist Created!", {
        description: "Your JSON is now live and copyable.",
        action: {
          label: "View Gist",
          onClick: () => window.open(result.url, "_blank")
        }
      })
      setIsGistDialogOpen(false)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const jumpToError = () => {
    if (!error || !error.line || !textareaRef.current) return

    const lines = input.split("\n")
    let cursorPosition = 0
    for (let i = 0; i < error.line - 1; i++) {
      cursorPosition += lines[i].length + 1
    }
    if (error.column) {
      cursorPosition += error.column - 1
    }

    textareaRef.current.focus()
    textareaRef.current.setSelectionRange(cursorPosition, cursorPosition + (lines[error.line - 1]?.length || 0))
    textareaRef.current.scrollTo({
      top: (error.line - 1) * 24, // Refined line height
      behavior: "smooth"
    })
    toast.info(`Positioned at Line ${error.line}`)
  }

  const isSuccess = error?.message.includes("valid")

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Tab Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-background/20 backdrop-blur-3xl rounded-2xl border border-primary/5 shadow-2xl overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            layoutId={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              "group relative flex items-center gap-2.5 px-6 py-3 rounded-xl transition-all cursor-pointer min-w-[140px] max-w-[220px]",
              activeTabId === tab.id 
                ? "bg-primary/10 border border-primary/20 text-primary shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]" 
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary/80 border border-transparent"
            )}
          >
            <FileJson className={cn("w-3.5 h-3.5", activeTabId === tab.id ? "text-primary" : "text-muted-foreground/50")} />
            <input
              className={cn(
                "bg-transparent border-none focus:ring-0 text-xs font-bold truncate outline-none w-full",
                activeTabId === tab.id ? "text-primary" : "text-muted-foreground"
              )}
              value={tab.title}
              onChange={(e) => handleRenameTab(tab.id, e.target.value)}
              onClick={(e) => activeTabId === tab.id && e.stopPropagation()}
            />
            <button
              onClick={(e) => handleCloseTab(e, tab.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all ml-1"
            >
              <Minimize2 className="w-2.5 h-2.5" />
            </button>
            {activeTabId === tab.id && (
              <motion.div 
                layoutId="active-pill"
                className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
              />
            )}
          </motion.div>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddTab}
          className="h-[46px] w-[46px] shrink-0 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all ml-1 border border-dashed border-primary/10"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>

      <motion.div 
        key={activeTabId} // Key by tab ID to trigger animations on switch
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full"
      >
      {/* Input Section */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
               <FileJson className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">Input Source</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Raw Data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-primary/5 p-1 rounded-xl border border-primary/10">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsCompareShowing(false)
                  setIsSchemaShowing(false)
                }}
                className={cn(
                  "h-8 px-3 transition-all rounded-lg text-[11px] font-bold uppercase tracking-wider",
                  (!isCompareShowing && !isSchemaShowing) ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
                )}
              >
                Edit
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsCompareShowing(!isCompareShowing)
                  setIsSchemaShowing(false)
                  if (viewMode === 'diff') setViewMode('code')
                }}
                className={cn(
                  "h-8 px-3 transition-all rounded-lg text-[11px] font-bold uppercase tracking-wider",
                  isCompareShowing ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
                )}
              >
                Compare
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsSchemaShowing(!isSchemaShowing)
                  setIsCompareShowing(false)
                }}
                className={cn(
                  "h-8 px-3 transition-all rounded-lg text-[11px] font-bold uppercase tracking-wider",
                  isSchemaShowing ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
                )}
              >
                Schema
              </Button>
            </div>

            <div className="w-[1px] h-4 bg-primary/10 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3 text-muted-foreground hover:text-primary transition-all rounded-lg gap-2 cursor-pointer">
                <Wrench className="w-4 h-4" />
                <span className="text-xs font-bold">Tools</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background/80 backdrop-blur-xl border-primary/10 rounded-xl shadow-2xl p-1.5 min-w-[160px]">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 py-2">Data Utilities</DropdownMenuLabel>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg flex items-center gap-2 font-medium text-sm">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span>Mock Generator</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="bg-background/80 backdrop-blur-xl border-primary/10 rounded-xl shadow-2xl p-1.5 min-w-[140px]">
                        <DropdownMenuItem onClick={() => handleGenerateMockData(10)} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg">10 Records</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateMockData(50)} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg">50 Records</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateMockData(100)} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg">100 Records</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={() => setIsHistoryOpen(true)} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg flex items-center gap-2 font-medium text-sm">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>View History</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-[1px] h-4 bg-primary/10 mx-1" />

            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={triggerFileUpload} 
                title="Upload JSON"
                className="h-8 w-8 text-muted-foreground hover:bg-primary/5 hover:text-primary rounded-lg"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClear} 
                title="Clear All"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className={cn("grid gap-4", isCompareShowing ? "grid-cols-1" : "grid-cols-1")}>
          <Card className={cn("transition-all duration-500 border-primary/10 bg-background/40 backdrop-blur-xl rounded-2xl overflow-hidden relative group shadow-inner flex flex-col", isCompareShowing ? "h-[300px]" : "h-[600px]")}>
            <div className="flex flex-col gap-3 p-6 border-b border-primary/5 bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/10 shrink-0">
                  <Globe className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/80">API URL</span>
                </div>
                <Input 
                  placeholder="https://api.example.com/data.json"
                  className="h-8 flex-1 bg-background/50 border-primary/10 text-[11px] font-mono"
                  value={fetchUrl}
                  onChange={(e) => setFetchUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 px-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 font-bold"
                  onClick={handleFetch}
                  disabled={isFetching || !fetchUrl}
                >
                  {isFetching ? "..." : "Fetch"}
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Source JSON..."
                className={cn(
                  "h-full w-full font-mono text-sm leading-relaxed p-6 bg-transparent border-none rounded-none focus-visible:ring-0 resize-none transition-all duration-500",
                  error && !isSuccess ? "text-destructive" : "text-foreground"
                )}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <AnimatePresence>
                {input && !isCompareShowing && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute bottom-6 right-6 flex items-center gap-3 text-[11px] font-semibold tracking-tight text-muted-foreground bg-background/90 px-3 py-1.5 rounded-full backdrop-blur-md border border-primary/10 shadow-xl z-20"
                  >
                    <span className="flex items-center gap-1.5 border-r border-primary/5 pr-3">
                      <Info className="w-3.5 h-3.5 text-primary/60" />
                      {input.length} Characters
                    </span>
                    <span className="text-primary font-bold">
                      {getJsonSize(input)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {isCompareShowing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Compare With (Target JSON)</span>
              </div>
              <Card className="h-[300px] border-primary/10 bg-background/40 backdrop-blur-xl rounded-2xl overflow-hidden relative group shadow-inner flex flex-col">
                <Textarea
                  placeholder="Target JSON to compare against..."
                  className="h-full w-full font-mono text-sm leading-relaxed p-6 bg-transparent border-none rounded-none focus-visible:ring-0 resize-none transition-all duration-500 text-foreground"
                  value={diffInput}
                  onChange={(e) => setDiffInput(e.target.value)}
                />
              </Card>
            </motion.div>
          )}

          {isSchemaShowing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-blue-500/40" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">JSON Schema (AJV)</span>
              </div>
              <Card className="h-[300px] border-primary/10 bg-background/40 backdrop-blur-xl rounded-2xl overflow-hidden relative group shadow-inner flex flex-col">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleAutoGenerateSchema}
                    className="h-8 px-3 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 font-bold transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Auto-Generate
                  </Button>
                </div>
                <Textarea
                  placeholder="Paste your JSON Schema here..."
                  className="h-full w-full font-mono text-sm leading-relaxed p-6 bg-transparent border-none rounded-none focus-visible:ring-0 resize-none transition-all duration-500 text-foreground pt-14"
                  value={schemaInput}
                  onChange={(e) => setSchemaInput(e.target.value)}
                />
              </Card>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button 
            onClick={handleFormat} 
            disabled={mounted ? (!input.trim() || isFormatting) : undefined}
            className={cn("h-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] font-bold", (isCompareShowing || isSchemaShowing) ? "col-span-1" : "col-span-1")}
          >
            {isFormatting ? (
              <span className="flex items-center gap-2">
                 <motion.div
                   animate={{ rotate: 360 }}
                   transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                 >
                   <Sparkles className="w-4 h-4 text-white" />
                 </motion.div>
                 Magic...
              </span>
            ) : (
              "Format JSON"
            )}
          </Button>

          {isCompareShowing && (
            <Button 
              onClick={handleRunDiff}
              disabled={mounted ? (!input.trim() || !diffInput.trim()) : undefined}
              className="h-12 rounded-xl bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] font-bold col-span-1"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Run Diff
            </Button>
          )}

          {isSchemaShowing && (
            <Button 
              onClick={handleSchemaValidate}
              disabled={mounted ? (!input.trim() || !schemaInput.trim()) : undefined}
              className="h-12 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] font-bold col-span-1"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Validate Schema
            </Button>
          )}
          <Button 
            variant="secondary"
            onClick={handleMinify}
            disabled={mounted ? (!input.trim() || isFormatting) : undefined}
            className="h-12 rounded-xl font-bold bg-secondary hover:bg-secondary/80 transition-all"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Minify
          </Button>
          <Button 
            variant="outline" 
            onClick={handleValidate}
            disabled={mounted ? !input.trim() : undefined}
            className="h-12 rounded-xl border-primary/20 hover:bg-primary/5 transition-all font-bold"
          >
            Validate
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {(error || schemaResult) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="overflow-hidden pt-2 space-y-3"
            >
              {error && (
                <Alert variant={isSuccess ? "default" : "destructive"} className={`rounded-2xl border px-6 py-5 backdrop-blur-md shadow-lg ${isSuccess ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}`}>
                  <div className="flex items-start justify-between w-full">
                    <div className="flex gap-4">
                      <div className={`p-2 rounded-lg ${isSuccess ? "bg-primary/20" : "bg-destructive/20"}`}>
                         <AlertCircle className={`h-5 w-5 ${isSuccess ? "text-primary font-bold" : "text-destructive"}`} />
                      </div>
                      <div>
                        <AlertTitle className="text-lg font-bold tracking-tight">
                          {isSuccess ? "Verified & Clean" : "Syntax Anomaly Found"}
                        </AlertTitle>
                        <AlertDescription className="text-sm font-medium text-foreground/70 mt-1 leading-relaxed">
                          {error.message}
                          {!isSuccess && (error.line || error.column) && (
                            <div className="mt-4 flex items-center gap-4">
                              <span className="text-xs font-mono font-bold bg-destructive/10 px-3 py-1 rounded-full border border-destructive/10">
                                {error.line ? `Line ${error.line}` : ""}
                                {error.column ? `, Col ${error.column}` : ""}
                              </span>
                              {error.line && (
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  onClick={jumpToError}
                                  className="h-auto p-0 text-xs text-destructive hover:text-destructive/80 font-black flex items-center gap-2 underline underline-offset-4 decoration-2"
                                >
                                  <Target className="w-3.5 h-3.5" />
                                  Highlight Critical Point
                                </Button>
                              )}
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </div>
                </Alert>
              )}

              {schemaResult && (
                <Alert 
                  variant={schemaResult.isValid ? "default" : "destructive"} 
                  className={cn(
                    "rounded-2xl border px-6 py-5 backdrop-blur-md shadow-lg",
                    schemaResult.isValid ? "border-blue-500/20 bg-blue-500/5" : "border-destructive/20 bg-destructive/5"
                  )}
                >
                   <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg", schemaResult.isValid ? "bg-blue-500/20" : "bg-destructive/20")}>
                       <ShieldCheck className={cn("h-5 w-5", schemaResult.isValid ? "text-blue-500" : "text-destructive")} />
                    </div>
                    <div>
                      <AlertTitle className="text-lg font-bold tracking-tight">
                        {schemaResult.isValid ? "Contract Fulfilled" : "Compliance Breach"}
                      </AlertTitle>
                      <AlertDescription className="text-sm font-medium mt-1">
                        {schemaResult.isValid ? (
                          "The JSON matches the provided schema perfectly."
                        ) : (
                          <ul className="list-disc list-inside space-y-1">
                            {schemaResult.errors.map((err, i) => (
                              <li key={i} className="text-xs font-mono">{err}</li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Output Section */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between pt-6 pb-2 border-b border-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              {viewMode === 'code' ? (
                <Check className="w-5 h-5 text-primary" />
              ) : (
                <Braces className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">Formatted Output</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">The Output</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/5 p-1 rounded-xl border border-primary/10">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all rounded-lg gap-2 cursor-pointer font-bold">
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-background/80 backdrop-blur-xl border-primary/10 rounded-xl overflow-hidden shadow-2xl p-1.5 focus:outline-none">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 py-2">Quick Copy</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleCopy} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-primary/5 rounded-lg m-0.5">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                      <Copy className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Copy Formatted</div>
                      <div className="text-[10px] text-muted-foreground">To system clipboard</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-primary/5 rounded-lg m-0.5">
                      <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                        <Wand2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-sm">Copy As...</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="bg-background/80 backdrop-blur-xl border-primary/10 rounded-xl shadow-2xl p-1.5 min-w-[150px]">
                        <DropdownMenuItem onClick={() => handleCopyAs('ts')} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg">TypeScript</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyAs('yaml')} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg">YAML</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyAs('csv')} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg">CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyAs('url')} className="px-3 py-2 cursor-pointer hover:bg-primary/5 rounded-lg">URL Params</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-primary/5 mx-2 my-1.5" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 py-2">Publish & Save</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setIsGistDialogOpen(true)} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-amber-500/5 rounded-lg m-0.5">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm">GitHub Gist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownload} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-emerald-500/5 rounded-lg m-0.5">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-sm text-emerald-500">Download .json</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="h-[600px] border-primary/10 bg-background/40 backdrop-blur-xl rounded-2xl overflow-hidden relative group shadow-inner flex flex-col">
          <div className="flex flex-col gap-3 p-6 border-b border-primary/5 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary/60" />
                <Input 
                  placeholder="Filter keys or values..."
                  className="h-8 w-64 bg-background/50 border-primary/10 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-primary/10">
                <Button 
                  variant={viewMode === 'code' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('code')}
                  className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
                >
                  Code
                </Button>
                <Button 
                  variant={viewMode === 'tree' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('tree')}
                  className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
                >
                  Tree
                </Button>
                <Button 
                  variant={viewMode === 'diff' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('diff')}
                  disabled={diffResult.length === 0}
                  className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
                >
                  Diff
                </Button>
              </div>
            </div>

            <Separator className="bg-primary/5" />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10 border border-primary/10 shrink-0">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Query</span>
              </div>
              <Input 
                placeholder="e.g. .users[0].profile.email"
                className="h-8 flex-1 bg-background/50 border-primary/10 text-[11px] font-mono"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
              />
              {queryInput && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setQueryInput("")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden group/output">
            <div className="h-full">
              {viewMode === 'code' ? (
                <div className="h-full overflow-hidden p-6 custom-scrollbar">
                  {output ? (
                    <JsonOutput 
                      code={JSON.stringify(executeQuery(JSON.parse(output), queryInput), null, 2)} 
                      searchTerm={searchTerm}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 font-mono text-sm italic py-12">
                      <div className="relative mb-6">
                        <Braces className="w-16 h-16 opacity-10" />
                        <motion.div 
                          animate={{ x: [0, 10, 0], opacity: [0.1, 0.3, 0.1] }}
                          transition={{ repeat: Infinity, duration: 3 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <ChevronRight className="w-8 h-8" />
                        </motion.div>
                      </div>
                      <h3 className="text-lg font-bold tracking-tight mb-1">Waiting for Data ✨</h3>
                      <p className="text-xs max-w-[200px] text-center leading-relaxed">
                        Formatted results will materialize here with full syntax highlighting.
                      </p>
                    </div>
                  )}
                </div>
              ) : viewMode === 'tree' ? (
                <div className="p-6">
                  {output ? (
                    <JsonTreeView 
                      data={executeQuery(JSON.parse(output), queryInput)} 
                      onHoverPath={setHoveredPath}
                      searchTerm={searchTerm}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground/30 font-mono text-sm italic">
                      No data to explore
                    </div>
                  )}
                </div>
              ) : (
                <DiffViewer diffs={diffResult} />
              )}
            </div>
            
            <AnimatePresence>
                {hoveredPath && viewMode === 'tree' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-6 left-6 right-6 flex items-center gap-2 text-[10px] font-bold tracking-widest text-primary bg-background/95 px-4 py-2.5 rounded-xl backdrop-blur-xl border border-primary/20 shadow-2xl z-30 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded-md shrink-0">
                      <Target className="w-3 h-3" />
                      PATH
                    </div>
                    <span className="truncate font-mono opacity-80">{hoveredPath}</span>
                    <button 
                      onClick={() => {
                        copyToClipboard(hoveredPath)
                        toast.success("Path copied")
                      }}
                      className="ml-auto p-1 hover:bg-primary/10 rounded-md transition-all duration-200"
                    >
                      <Copy className="w-3 h-3 text-primary/60" />
                    </button>
                  </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
              {isFormatting && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background/40 backdrop-blur-md flex flex-col items-center justify-center z-20 gap-4"
                >
                   <motion.div
                      animate={{ 
                        scale: [1, 1.15, 1],
                        rotate: [0, 90, 180, 270, 360]
                      }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="w-14 h-14 rounded-2xl border-[3px] border-primary/20 border-t-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                   />
                   <p className="text-sm font-bold text-primary animate-pulse tracking-widest uppercase">Processing</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      {/* Gist Sharing Dialog (Simplified Overlay) */}
      <AnimatePresence>
        {isGistDialogOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-background border border-primary/20 rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Share to GitHub Gist</h3>
                  <p className="text-xs text-muted-foreground">Publish your JSON structure instantly.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Filename</label>
                  <Input 
                    value={gistFilename} 
                    onChange={(e) => setGistFilename(e.target.value)}
                    placeholder="data.json"
                    className="h-11 rounded-xl bg-primary/5 border-primary/10 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={gistIsPublic ? "secondary" : "ghost"}
                    onClick={() => setGistIsPublic(true)}
                    className={cn("h-11 rounded-xl gap-2", gistIsPublic ? "bg-primary/20 text-primary" : "text-muted-foreground")}
                  >
                    <Globe className="w-4 h-4" />
                    Public
                  </Button>
                  <Button 
                    variant={!gistIsPublic ? "secondary" : "ghost"}
                    onClick={() => setGistIsPublic(false)}
                    className={cn("h-11 rounded-xl gap-2", !gistIsPublic ? "bg-primary/20 text-primary" : "text-muted-foreground")}
                  >
                    <Lock className="w-4 h-4" />
                    Private
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-primary/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Personal Access Token (Optional)</label>
                    <a href="https://github.com/settings/tokens" target="_blank" className="text-[10px] text-primary hover:underline font-bold">Get Token</a>
                  </div>
                  <Input 
                    type="password"
                    value={gistToken} 
                    onChange={(e) => setGistToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="h-11 rounded-xl bg-primary/5 border-primary/10 focus-visible:ring-primary/20"
                  />
                  <p className="text-[9px] text-muted-foreground leading-tight px-1">
                    Required for private Gists or if anonymous creation is disabled on your GitHub account.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsGistDialogOpen(false)}
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold"
                >
                  {isSharing ? "Publishing..." : "Create Gist"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HistoryDrawer 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistory}
        onClearHistory={handleClearHistory}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".json,application/json" 
        className="hidden" 
      />
    </motion.div>
    </div>
  )
}
