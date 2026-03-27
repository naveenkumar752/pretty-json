# 🚀 Deploying JSON Lens to Vercel

Follow these steps to take your **JSON Lens** app from local development to a live production environment.

## 1. Push to GitHub
Before deploying, you need your code in a GitHub repository.

1. **Create a new repository** on [GitHub](https://github.com/new).
2. **Initialize and push** your local code:
   ```powershell
   git init
   git add .
   git commit -m "feat: initial production-ready version"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pretty-json.git
   git push -u origin main
   ```

## 2. Connect to Vercel
Vercel's tight integration with Next.js makes deployment seamless.

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** > **"Project"**.
3. Select your **pretty-json** repository from the list.
4. Keep the default build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Click **"Deploy"**.

## 3. Post-Deployment Optimization
To ensure maximum performance and security:

- **Environment Variables**: JSON Lens is purely client-side, so no sensitive variables are required for basic features.
- **Analytics**: Enable **Vercel Web Analytics** in the project settings to track usage and performance.
- **Custom Domain**: Connect a professional domain (e.g., `json-lens.com`) under the "Settings" > "Domains" tab.

## 🛠️ Common Build Fixes
I have already performed several optimizations to prevent common deployment issues:
- **Type Safety**: Fixed `framer-motion` and `@base-ui` type mismatches that often break CI/CD pipelines.
- **Production-Ready Layout**: Ensured `sonner` Toaster and `ThemeProvider` are correctly placed for zero flickering.
- **Hydration Sync**: Added `suppressHydrationWarning` to the root layout to handle system-theme detection.

---

Your app will be live at a URL like `pretty-json-xxx.vercel.app` in less than 2 minutes!
