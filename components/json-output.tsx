"use client"

import * as React from "react"
import { Highlight, themes, type Language } from "prism-react-renderer"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Terminal, Code2 } from "lucide-react"

interface JsonOutputProps {
  code: string;
  language?: Language;
  searchTerm?: string;
}

export function JsonOutput({ code, language = "json", searchTerm = "" }: JsonOutputProps) {
  const { theme } = useTheme()
  const highlightTheme = theme === "dark" ? themes.vsDark : themes.vsLight

  const renderTokenContent = (content: string) => {
    if (!searchTerm || !content.toLowerCase().includes(searchTerm.toLowerCase())) {
      return content;
    }
    const parts = content.split(new RegExp(`(${searchTerm})`, "gi"));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={i} className="bg-primary/40 text-primary-foreground rounded-sm px-0.5 ring-1 ring-primary/20">{part}</mark>
          ) : part
        )}
      </>
    );
  };

  return (
    <div className="h-full relative overflow-hidden bg-background/5">
      <AnimatePresence mode="wait">
        {!code ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative p-6 rounded-3xl bg-background/20 backdrop-blur-md border border-primary/10 shadow-2xl">
                <Terminal className="w-12 h-12 text-primary/40" />
              </div>
            </div>
            <div className="max-w-[280px] space-y-2">
              <h3 className="text-lg font-bold tracking-tight text-foreground/80 flex items-center justify-center gap-2">
                Waiting for Data
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </h3>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                Formatted results will materialize here with full syntax highlighting.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full overflow-auto custom-scrollbar font-mono text-[13px] leading-[1.6] p-6 tracking-wider"
          >
            <Highlight
              theme={highlightTheme}
              code={code}
              language={language}
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={`${className} bg-transparent overflow-visible`} style={{ ...style, backgroundColor: 'transparent' }}>
                  {tokens.map((line, i) => {
                    const { key: lineKey, ...lineProps } = getLineProps({ line, key: i });
                    return (
                      <div key={lineKey as string} {...lineProps} className="flex group hover:bg-primary/[0.03] transition-colors rounded-sm min-w-fit">
                        {/* Line Gutter - Premium Style */}
                        <span className="w-12 text-muted-foreground/20 text-right pr-6 select-none border-r border-primary/5 group-hover:text-muted-foreground/50 transition-colors font-semibold shrink-0">
                          {i + 1}
                        </span>
                        
                        {/* High-Contrast Tokens with Explicit Whitespace Preservation */}
                        <span className="pl-6 pb-0.5 whitespace-pre">
                          {line.map((token, key) => {
                            const { key: tokenKey, ...tokenProps } = getTokenProps({ token, key });
                            
                            // Custom high-vibrancy styling for JSON tokens
                            const isProperty = token.types.includes("property");
                            const isString = token.types.includes("string");
                            const isNumber = token.types.includes("number");
                            const isBoolean = token.types.includes("boolean");
                            const isNull = token.types.includes("null") || (token.types.includes("keyword") && token.content === "null");
                            
                            let customClass = "drop-shadow-sm transition-colors duration-200";
                            if (isProperty) customClass += " text-sky-400 font-bold opacity-100";
                            else if (isString) customClass += " text-amber-300 brightness-110";
                            else if (isNumber) customClass += " text-emerald-400 font-medium";
                            else if (isBoolean) customClass += " text-indigo-400 font-semibold";
                            else if (isNull) customClass += " text-rose-400 italic";
                            else if (token.types.includes("punctuation") || token.types.includes("operator")) customClass += " text-muted-foreground/40";

                            return (
                              <span 
                                key={tokenKey as string} 
                                {...tokenProps} 
                                className={`${tokenProps.className || ""} ${customClass}`}
                                style={{ ...tokenProps.style, color: undefined }} // Let Tailwind handle colors for priority tokens
                              >
                                {renderTokenContent(token.content)}
                              </span>
                            );
                          })}
                        </span>
                      </div>
                    );
                  })}
                </pre>
              )}
            </Highlight>

            {/* Floating Language Indicator */}
            <div className="absolute top-4 right-6 flex items-center gap-2 px-2.5 py-1 rounded-full bg-background/50 backdrop-blur-md border border-primary/5 text-[10px] font-bold text-muted-foreground select-none uppercase tracking-tighter shadow-sm opacity-50 group-hover:opacity-100 transition-opacity">
              <Code2 className="w-3 h-3" />
              {language}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
