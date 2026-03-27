/**
 * JSON utility functions for formatting, validation, and advanced error parsing.
 */

export interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

export interface JsonProcessResult {
  output: string;
  error: JsonError | null;
}

/**
 * Enhanced error parsing for JSON errors.
 */
export function parseJsonError(err: any, input: string): JsonError {
  const message = err.message || "Unknown error";
  let line: number | undefined;
  let column: number | undefined;

  // Case 1: "at line 1 column 5"
  const lineColMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1]);
    column = parseInt(lineColMatch[2]);
  } else {
    // Case 2: "at line 1"
    const lineMatch = message.match(/line (\d+)/i);
    if (lineMatch) {
      line = parseInt(lineMatch[1]);
    } else {
      // Case 3: "at position 10" or "position 10"
      const posMatch = message.match(/position (\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        // Convert overall position to line and column
        const linesUntilPos = input.slice(0, pos).split("\n");
        line = linesUntilPos.length;
        column = linesUntilPos[linesUntilPos.length - 1].length + 1;
      }
    }
  }

  // Clean the message (remove the "at line..." suffix if we extracted it)
  const cleanMessage = message.replace(/at line \d+ column \d+/i, "")
                             .replace(/at line \d+/i, "")
                             .replace(/at position \d+/i, "")
                             .replace(/in JSON at position \d+/i, "")
                             .trim();

  return { 
    message: cleanMessage || message, 
    line, 
    column 
  };
}

/**
 * Parses and formats a JSON string with indentation.
 */
export function parseAndFormatJson(input: string, spaces: number = 2): JsonProcessResult {
  if (!input.trim()) {
    return { output: "", error: null };
  }

  try {
    const parsed = JSON.parse(input);
    const formatted = JSON.stringify(parsed, null, spaces);
    return { output: formatted, error: null };
  } catch (err: any) {
    return {
      output: "",
      error: parseJsonError(err, input),
    };
  }
}

/**
 * Minifies a JSON string.
 */
export function minifyJson(input: string): JsonProcessResult {
  if (!input.trim()) {
    return { output: "", error: null };
  }

  try {
    const parsed = JSON.parse(input);
    const minified = JSON.stringify(parsed);
    return { output: minified, error: null };
  } catch (err: any) {
    return {
      output: "",
      error: parseJsonError(err, input),
    };
  }
}

/**
 * Calculates human-readable size.
 */
export function getJsonSize(text: string): string {
  if (!text) return "0 B";
  const bytes = new TextEncoder().encode(text).length;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Downloads content as JSON.
 */
export function downloadJsonFile(content: string, filename: string = "json-lens-export.json") {
  if (!content) return;
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates whether a string is valid JSON.
 */
export function validateJson(input: string): { isValid: boolean; error: JsonError | null } {
  if (!input.trim()) {
    return { isValid: false, error: { message: "Input is empty" } };
  }

  try {
    JSON.parse(input);
    return { isValid: true, error: null };
  } catch (err: any) {
    return {
      isValid: false,
      error: parseJsonError(err, input),
    };
  }
}

/**
 * Clipboard helper.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy text into clipboard: ", err);
    return false;
  }
}

/**
 * Converts JSON to TypeScript interfaces.
 */
export function jsonToTypeScript(obj: any, name: string = "Root"): string {
  const interfaces: string[] = [];
  const seenObjects = new Set();

  function generate(val: any, interfaceName: string): string {
    if (val === null) return "any";
    if (typeof val !== "object") return typeof val;
    if (Array.isArray(val)) {
      if (val.length === 0) return "any[]";
      return `${generate(val[0], interfaceName)}[]`;
    }

    // Object
    const lines = [`export interface ${interfaceName} {`];
    for (const key in val) {
      const subName = key.charAt(0).toUpperCase() + key.slice(1);
      const type = generate(val[key], subName);
      lines.push(`  ${key}: ${type};`);
    }
    lines.push("}");
    const res = lines.join("\n");
    if (!seenObjects.has(res)) {
      interfaces.push(res);
      seenObjects.add(res);
    }
    return interfaceName;
  }

  generate(obj, name);
  return interfaces.reverse().join("\n\n");
}

/**
 * Converts JSON to YAML (Simplified).
 */
export function jsonToYaml(obj: any, indent: number = 0): string {
  const spaces = " ".repeat(indent);
  if (obj === null) return "null";
  if (typeof obj !== "object") return String(obj);
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map(item => `\n${spaces}- ${jsonToYaml(item, indent + 2)}`).join("");
  }

  const lines = [];
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === "object" && val !== null) {
      lines.push(`${spaces}${key}:${Array.isArray(val) ? "" : "\n"}${jsonToYaml(val, indent + 2)}`);
    } else {
      lines.push(`${spaces}${key}: ${val}`);
    }
  }
  return lines.join("\n");
}

/**
 * Converts JSON to CSV (Flattens if array of objects).
 */
export function jsonToCsv(obj: any): string {
  let data = Array.isArray(obj) ? obj : [obj];
  if (data.length === 0) return "";

  // Flatten objects for CSV
  const flatten = (o: any, prefix = ""): any => {
    return Object.keys(o).reduce((acc: any, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (typeof o[k] === "object" && o[k] !== null && !Array.isArray(o[k])) {
        Object.assign(acc, flatten(o[k], pre + k));
      } else {
        acc[pre + k] = o[k];
      }
      return acc;
    }, {});
  };

  const flattenedData = data.map(item => flatten(item));
  const headers = Array.from(new Set(flattenedData.flatMap(item => Object.keys(item))));
  
  const csvRows = [
    headers.join(","),
    ...flattenedData.map(row => 
      headers.map(header => {
        const val = row[header];
        return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : String(val ?? "");
      }).join(",")
    )
  ];

  return csvRows.join("\n");
}

/**
 * Converts JSON to URL Query Params.
 */
export function jsonToUrlParams(obj: any): string {
  if (typeof obj !== "object" || obj === null) return "";
  
  const params = new URLSearchParams();
  const flatten = (o: any, prefix = "") => {
    for (const key in o) {
      const value = o[key];
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (typeof value === "object" && value !== null) {
        flatten(value, fullKey);
      } else {
        params.append(fullKey, String(value));
      }
    }
  };
  
  flatten(obj);
  return params.toString();
}
/**
 * Computes structural differences between two JSON objects.
 */
export interface JsonDiffEntry {
  type: "added" | "removed" | "changed" | "unchanged";
  key: string;
  value?: any;
  oldValue?: any;
  level: number;
}

export function computeJsonDiff(obj1: any, obj2: any, level: number = 0): JsonDiffEntry[] {
  const diffs: JsonDiffEntry[] = [];
  
  const allKeys = Array.from(new Set([
    ...Object.keys(obj1 || {}),
    ...Object.keys(obj2 || {})
  ])).sort();

  for (const key of allKeys) {
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    if (!(key in (obj1 || {}))) {
      diffs.push({ type: "added", key, value: val2, level });
    } else if (!(key in (obj2 || {}))) {
      diffs.push({ type: "removed", key, oldValue: val1, level });
    } else if (val1 !== val2) {
      if (typeof val1 === "object" && val1 !== null && typeof val2 === "object" && val2 !== null) {
        diffs.push({ type: "unchanged", key, value: "{...}", level }); // Header for object
        diffs.push(...computeJsonDiff(val1, val2, level + 1));
      } else {
        diffs.push({ type: "changed", key, value: val2, oldValue: val1, level });
      }
    } else {
      diffs.push({ type: "unchanged", key, value: val1, level });
    }
  }

  return diffs;
}

/**
 * Detects if a string is actually stringified JSON.
 */
export function isStringifiedJson(text: any): boolean {
  if (typeof text !== "string") return false;
  const trimmed = text.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || 
      (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "object" && parsed !== null;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Executes a simple JQ-style query on a JSON object.
 * Supports dot notation and basic array indexing: .users[0].name
 */
export function executeQuery(data: any, query: string): any {
  if (!query || query === "." || query === "$") return data;
  
  try {
    // Basic dot notation support
    // Remove leading dot, then split by dots and handle bracket notation
    const cleanQuery = query.startsWith(".") ? query.slice(1) : query;
    if (!cleanQuery) return data;

    const parts = cleanQuery.split(/[.\[\]]/).filter(Boolean);
    let current = data;
    
    for (let part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // If the part is a number, treat it as an array index
      if (/^\d+$/.test(part)) {
        current = current[parseInt(part)];
      } else {
        current = current[part];
      }
    }
    return current;
  } catch (e) {
    return undefined;
  }
}
