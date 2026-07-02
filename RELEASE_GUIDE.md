# App Release Guide

Follow these 3 simple steps to create a new app version and release it to GitHub:

---

### Step 1: Update the Version in `package.json`
Whenever you make new changes to the app, open [package.json](package.json) and increment the `version` number (e.g., from `1.0.5` to `1.0.6`).
```json
"version": "1.0.6"
```

---

### Step 2: Run the Release Command in Terminal
Open your VS Code terminal. Since the token is no longer stored inside `package.json` (to prevent GitHub security blocks), you must set it in your terminal session before building the release:

**For Command Prompt (CMD):**
```cmd
set GH_TOKEN=your_github_token_here
npm run release
```

**For PowerShell:**
```powershell
$env:GH_TOKEN="your_github_token_here"
npm run release
```

**What does this command do?**
* Builds the Angular application (`ng build`).
* Packages the app into a Windows installer `.exe` and generates `latest.yml`.
* Automatically uploads these files to your GitHub Releases.

---

### Step 3: Publish the Release on GitHub
Once the build and upload process completes successfully (takes about 2-3 minutes):
1. Go to the **[GitHub Releases](https://github.com/sham843/POS/releases)** page in your browser.
2. You will see the new version (e.g., `v1.0.8`) marked as a **Draft**.
3. Click the **Edit** button on the right side of the draft version.
4. Scroll down to the bottom and click **Publish release**.

---

💡 **Note: How Auto-Updates Work**
* **On App Launch:** Once the release is published on GitHub, existing users' apps will check for updates immediately when they launch/start the app.
* **Auto-Check (Every 2 Hours):** While the app remains open, it automatically checks for updates in the background every **2 hours**.
* **Manual Check:** Users can also click on the **Version Badge** (e.g., `v1.0.17`) on the Login/Dashboard pages to check for updates manually.

---

### ⚠️ Troubleshooting: GitHub Token Expired (401 Unauthorized)
If running `npm run release` fails with `HttpError: 401 Unauthorized` or `Bad credentials`, it means your GitHub Personal Access Token has expired or is invalid.

**How to generate a new token:**
1. Go to your GitHub account ➡️ **Settings** ➡️ **Developer settings** ➡️ **Personal access tokens** ➡️ **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Set a Note (e.g., `POS Release Token`), select the **`repo`** scope checkbox (required to upload releases), and generate the token.
4. Copy the generated token (it starts with `ghp_...`).
5. Use this new token to set `GH_TOKEN` in your terminal when running the release command (see Step 2).


