# SEDS Forms — Setup Guide

## What's included

| File | Purpose |
|---|---|
| `forms.html` | **Admin form builder** — create & manage forms |
| `view-form.html` | **Respondent view** — fill and submit forms |
| `Code.gs` | **Google Apps Script backend** — Sheets + Drive storage |

---

## 1 — Connect the Apps Script Backend

### Step 1: Open Google Apps Script

1. Go to [https://script.google.com](https://script.google.com)
2. Click **New project**
3. Delete any existing code in the editor

### Step 2: Paste Code.gs

1. Copy everything from `Code.gs` (in this folder)
2. Paste it into the Apps Script editor
3. Save the project (Ctrl+S) — name it **"SEDS Forms Backend"**

### Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Type" → select **Web app**
3. Set:
   - **Description**: SEDS Forms
   - **Execute as**: Me
   - **Who has access**: **Anyone** *(important!)*
4. Click **Deploy**
5. Click **Authorize access** when prompted and grant all permissions
6. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfyc.../exec`

### Step 4: Connect to the builder

1. Open **forms.html** in your browser (`http://127.0.0.1:5500/forms.html`)
2. Click the **⚙️ Settings** icon in the top-right
3. Paste your Web App URL
4. Click **Save & Connect**

✅ Done! The builder will now sync forms and responses to Google Drive.

---

## 2 — Create Your First Form

1. Click **Create New Form** on the dashboard
2. Give it a title
3. Add questions using the **+** toolbar on the right
4. Click **Publish** when ready
5. Copy the **Respondent Link** to share with others

### Admin Authentication & Security

- **Default Admin Password**: `SEDS@Admin2026` (or `SEDS@2026`)
- You will be prompted to enter the admin password when opening `forms.html`.
- You can change the password anytime in `Code.gs` under `CONFIG.ADMIN_PASSWORD`.
- Use the **🔒 Lock / Logout** button in the top navigation bar to lock the admin portal anytime.

### Admin vs Respondent Links

| Link | Who uses it | What it does |
|---|---|---|
| **Admin link** | Only you | Edit the form from any device/browser |
| **Respondent link** | Everyone else | Fill and submit the form |

> ⚠️ **Save your admin link!** It contains a secret token — lose it and you can't edit the form from another device.

---

## 3 — Where Data Goes in Google Drive

All data is stored inside:
📁 `1doKURy7SGoCTWHRxUUqoHoQRqoUBMkZV` (your shared folder)

```
📁 Your Drive Folder
├── 📁 FormDefinitions/
│   ├── SEDSxxx.json          ← form structure
│   └── SEDSyyy.json
└── 📁 FormResponses/
    ├── 📁 Registration Form/
    │   ├── 📊 Registration Form — Responses  ← Google Sheet
    │   └── 📁 Files/
    │       └── 📁 Upload your photo/
    │           └── 📁 RES1234.../
    │               └── photo.jpg
    └── 📁 Event Feedback/
        └── 📊 Event Feedback — Responses
```

---

## 4 — Question Types

| Type | Description |
|---|---|
| Short answer | Single line text |
| Paragraph | Multi-line text |
| Multiple choice | Pick one option (radio) |
| Checkboxes | Pick multiple options |
| Drop-down | Select from a list |
| File upload | Upload to Google Drive |
| Linear scale | Rate on a numeric scale |
| Rating | Star / heart / thumb rating |
| Multiple-choice grid | Matrix of radio buttons |
| Tick box grid | Matrix of checkboxes |
| Date | Date picker |
| Time | Time picker |

---

## 5 — Updating a Deployed App Script

If you need to update `Code.gs`:
1. Go to your Apps Script project
2. Edit the code
3. Click **Deploy → Manage deployments**
4. Click the pencil ✏️ on your deployment → select **New version** → **Deploy**

The same URL stays the same — no need to reconnect.

---

## 6 — Short URLs & Custom Link Slugs

Every form created can now have a custom short link on your domain (e.g. `https://kumaraguruseds.space/my-event` or `https://kumaraguruseds.space/feedback`).

### How to Create a Short Link:
1. Open the form in `forms.html` and click **Publish / Share** (or Get Links).
2. Under the **🌟 SEDS Short URL & Custom Slug** section:
   - Enter your desired slug (e.g. `workshop-2026`).
   - Or click **🎲 Auto** to automatically generate a clean, brandable slug.
   - The system checks slug availability in real time.
3. Click **🚀 Generate Link**.
4. The custom short URL is created, saved to your form definition, and deployed to Google Sheets & GitHub!
5. Use the 1-click **📋 Copy** button to share your short URL anywhere.

### How 404 Redirects Work:
When someone visits `https://kumaraguruseds.space/<slug>`:
- GitHub Pages serves `404.html`.
- `404.html` reads `links.json` from the repository.
- If the slug matches, it instantly and smoothly redirects the visitor to the full form destination URL.
- Direct form IDs (like `https://kumaraguruseds.space/SEDSxxx`) automatically route to `view-form.html?id=SEDSxxx`.

---

## 7 — Troubleshooting

| Problem | Fix |
|---|---|
| "Form not found" | Check that Apps Script is deployed & URL is saved in settings |
| Files not uploading | Verify Apps Script has Drive permission (re-authorize if needed) |
| Responses not saving | Check that the Web App is set to "Execute as: Me" and "Access: Anyone" |
| Admin link lost | Check browser LocalStorage for `seds_forms_v2` or find the form JSON in FormDefinitions/ |
| Short URL taking time | Allow 30–60 seconds for GitHub deployment to propagate across edge nodes |
