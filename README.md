
# WatchTracker

A fully responsive Watchlist Tracker Web Application to track your favorite anime, movies, and series. Features real-time sync across devices and an AI-powered 'Smart Paste' functionality to add multiple items at once.

## Local Development

1.  **Install dependencies:**
    ```sh
    npm install
    ```

2.  **Run the local server:**
    ```sh
    npm run dev
    ```
    This will start a local server using Vite. Open your browser to the provided URL (e.g., `http://localhost:5173`).

## Deployment to Netlify

This project is set up to be deployed to Netlify using Vite.

### 1. Connect Your Repository

In your Netlify dashboard, create a new site and connect it to the repository containing this project.

### 2. Build Settings

Netlify should automatically detect the settings from `netlify.toml`, but if not:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### 3. Environment Variables

The application requires a Google Gemini API key to function.

1.  Go to your site's **Site configuration > Environment variables**.
2.  Click **"Add a variable"**.
3.  Key: `API_KEY` (or `VITE_API_KEY` - both are supported)
4.  Value: `Your_Actual_Gemini_API_Key`
5.  Click **"Create variable"**.

**Note:** The API key will be embedded into the build at build time. Make sure to set it in Netlify's environment variables before deploying.

### 4. Deploy

Trigger a deploy. Netlify will build your application using Vite, and your environment variable will be embedded into the build.

### 5. PostCSS and Tailwind CSS

The project uses Tailwind CSS with PostCSS for production builds. Make sure to run `npm install` before building to install all dependencies including `tailwindcss`, `postcss`, and `autoprefixer`.
