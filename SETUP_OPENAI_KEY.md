# Setting Up OpenAI API Key for CSV Import

## 🔑 Required: OpenAI API Key

The CSV import feature uses GPT to extract project data from CSV rows. You need to set up your OpenAI API key as a secret in Supabase.

## 📝 Step-by-Step Setup

### Step 1: Get Your OpenAI API Key

If you don't have one yet:

1. **Go to OpenAI**: https://platform.openai.com/api-keys
2. **Sign in** or create an account
3. **Click "Create new secret key"**
4. **Copy the key** (you'll only see it once!)
   - Format: `sk-proj-xxxxxxxxxxxxxxxxxxxxx`

### Step 2: Set the Secret in Supabase

**Option A: Using Supabase Dashboard (Easiest)**

1. **Go to your Supabase Dashboard**:
   - URL: https://supabase.com/dashboard/project/esqnspdjyaamlycrools
   - Or go to: https://supabase.com/dashboard → Select your project

2. **Navigate to Edge Functions**:
   - In the left sidebar, click **"Edge Functions"**
   - Click on **"import-projects-csv"** function

3. **Go to Settings/Secrets**:
   - Click on **"Settings"** tab (or look for "Secrets" section)
   - Or go to: **Project Settings → Edge Functions → Secrets**

4. **Add the Secret**:
   - Click **"Add new secret"** or **"New secret"**
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Paste your OpenAI API key
   - Click **"Save"** or **"Add"**

**Option B: Using Supabase CLI**

If you prefer using the command line:

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref esqnspdjyaamlycrools

# Set the secret
supabase secrets set OPENAI_API_KEY=your-api-key-here

# Replace 'your-api-key-here' with your actual OpenAI API key
```

## ✅ Verify Setup

After setting the secret:

1. **Wait a minute** for the secret to propagate
2. **Try importing your CSV again**:
   - Go to Admin → Projects → Import CSV
   - Upload `sample-projects.csv`
   - Should now work!

## 🔍 Troubleshooting

### Still Getting the Error?

1. **Check Secret Name**: Must be exactly `OPENAI_API_KEY` (case-sensitive)

2. **Verify Secret is Set**:
   - Go to Supabase Dashboard → Edge Functions → import-projects-csv → Settings
   - Check if `OPENAI_API_KEY` is listed in secrets

3. **Redeploy Function** (sometimes needed):
   ```bash
   supabase functions deploy import-projects-csv
   ```

4. **Check API Key Format**:
   - Should start with `sk-` or `sk-proj-`
   - No spaces or extra characters

### API Key Not Working?

- Check your OpenAI account has credits/billing set up
- Verify the key is active (not revoked)
- Check OpenAI dashboard for any usage/error messages

## 💰 Cost Note

OpenAI API charges per request:
- **gpt-4o-mini** (used in the function): Very affordable
- Processing ~20 projects from CSV: Usually costs a few cents
- Check OpenAI pricing: https://openai.com/api/pricing/

## 🎯 Quick Check

Once set up, you should be able to:
1. Upload CSV file
2. See progress bar
3. Get success message
4. See imported projects in the list

If you need help with any step, let me know!
