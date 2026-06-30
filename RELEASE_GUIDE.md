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
Open your VS Code terminal and run the following command:
```bash
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
2. You will see the new version (e.g., `v1.0.6`) marked as a **Draft**.
3. Click the **Edit** button on the right side of the draft version.
4. Scroll down to the bottom and click **Publish release**.

---

💡 **Note:** Once the release is published, existing users will automatically receive a notification to update their app when they launch it, and the app will auto-update itself!
