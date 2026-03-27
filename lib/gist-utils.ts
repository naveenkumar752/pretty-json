/**
 * Utility for sharing JSON content to GitHub Gists.
 */

export interface GistResult {
  url?: string;
  error?: string;
}

/**
 * Creates a Gist on GitHub.
 * If no token is provided, it will attempt an anonymous Gist (if GitHub allows it, otherwise fails).
 */
export async function shareToGist(
  content: string, 
  filename: string = "data.json", 
  isPublic: boolean = true,
  token?: string
): Promise<GistResult> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json",
    };

    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    const response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers,
      body: JSON.stringify({
        description: "Shared via JSON Lens ✨",
        public: isPublic,
        files: {
          [filename.endsWith(".json") ? filename : `${filename}.json`]: {
            content
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Inform the user about the need for a token if anonymous fails
      if (response.status === 401 || response.status === 403) {
        return { error: "GitHub requires a Personal Access Token for Gist creation. Please provide one in settings." };
      }
      return { error: errorData.message || "An error occurred while creating the Gist." };
    }

    const data = await response.json();
    return { url: data.html_url };
  } catch (e: any) {
    return { error: e.message || "Network error. Please check your connection." };
  }
}
