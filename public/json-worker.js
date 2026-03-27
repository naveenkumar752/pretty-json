// Web Worker for JSON Processing
self.onmessage = function(e) {
  const { action, data, params } = e.data;

  try {
    if (action === 'format') {
      const parsed = JSON.parse(data);
      const formatted = JSON.stringify(parsed, null, 2);
      self.postMessage({ action: 'format', result: formatted });
    } else if (action === 'query') {
      const parsed = JSON.parse(data);
      const result = executeQuery(parsed, params.query);
      self.postMessage({ action: 'query', result: JSON.stringify(result, null, 2) });
    }
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};

// Simplified executeQuery for worker (since it's a separate file)
function executeQuery(data, query) {
  if (!query || query === "." || query === "$") return data;
  
  try {
    const parts = query.split('.').filter(p => p !== "");
    let current = data;
    
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        current = current[key] ? current[key][index] : null;
      } else {
        current = current[part];
      }
    }
    return current ?? null;
  } catch (e) {
    return { error: "Query failed", details: e.message };
  }
}
