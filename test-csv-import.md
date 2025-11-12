# Quick Test Checklist for CSV Import

## ✅ Step-by-Step Testing Guide

### 1. Check if Edge Function is Deployed
Open your terminal and run:
```bash
cd /Users/dhruvgulwani/Documents/Project-Recommender-System-1
supabase functions list
```

If `import-projects-csv` is NOT in the list, deploy it:
```bash
supabase functions deploy import-projects-csv
```

### 2. Verify Environment Variables
Go to: https://supabase.com/dashboard/project/esqnspdjyaamlycrools/settings/functions

Make sure `OPENAI_API_KEY` is set as a secret.

### 3. Where to Find the Feature in Your App

**URL Path**: `http://localhost:5173/admin` (or your dev server URL)

**Steps**:
1. Start your dev server: `npm run dev`
2. Login with an admin account (email containing "admin")
3. You should see the Admin Dashboard
4. Click the **"Projects"** tab (first tab)
5. Look for **"Import CSV"** button (next to "Create Project" button)
6. Click it to open the upload dialog

### 4. Create Test CSV File

Create `test.csv` in your project root:

```csv
Project Name,Description,Skills,Category
AI Chatbot,Build a chatbot using Python and NLP,Python,NLP,AI/ML
Web App,Create a React web application,React,JavaScript,Web Development
```

### 5. Test the Import

1. Click "Import CSV" button
2. Select your `test.csv` file
3. Watch the progress bar
4. Check for success message
5. Refresh the projects list - you should see new projects (they'll be unpublished)

### 6. Check Logs if Something Fails

**Browser Console** (F12 → Console tab):
- Look for any error messages
- Check network tab to see if the API call is failing

**Supabase Logs**:
- Go to: https://supabase.com/dashboard/project/esqnspdjyaamlycrools/functions
- Click on `import-projects-csv`
- Check the "Logs" tab for any errors

## Common Issues

❌ **Button not showing?**
- Make sure you're logged in as admin
- Check that you're on the Projects tab (not Applications, Marks, etc.)

❌ **"Function not found" error?**
- Function not deployed yet - run: `supabase functions deploy import-projects-csv`

❌ **"Unauthorized" error?**
- Not logged in or not an admin user
- Logout and login again

❌ **"OpenAI API error"?**
- `OPENAI_API_KEY` secret not set in Supabase
- Go to Supabase Dashboard → Settings → Edge Functions → Secrets

## Visual Guide

When you're on the Admin Dashboard → Projects tab, you should see:

```
┌─────────────────────────────────────────┐
│ Project Management          [Import CSV] │ ← This button!
│                            [Create Project] │
├─────────────────────────────────────────┤
│                                         │
│  [List of existing projects...]        │
│                                         │
└─────────────────────────────────────────┘
```

The "Import CSV" button is right next to "Create Project"!
