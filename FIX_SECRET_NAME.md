# Fix: Secret Name Mismatch

## Issue
Your secret is named `OPEN_API_KEY` but the function expects `OPENAI_API_KEY` (with "AI" in the middle).

## ✅ Solution 1: Rename Secret (Easiest - Recommended)

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/esqnspdjyaamlycrools/settings/functions

2. **In the Secrets section**:
   - Find `OPEN_API_KEY`
   - Click to delete it (or note down the value)
   - Click "New secret"
   - **Name**: `OPENAI_API_KEY` (with "AI")
   - **Value**: Paste your API key
   - Click "Save"

3. **Wait 1-2 minutes** then test the import

## ✅ Solution 2: Use Updated Code

I've already updated the code to check for both names, but you need to redeploy:

**Via Dashboard:**
1. Go to Edge Functions → import-projects-csv
2. Copy the updated code from `supabase/functions/import-projects-csv/index.ts`
3. Paste and deploy via dashboard

**Recommended**: Just rename the secret - it's much easier!

---

**Quick Fix**: Rename `OPEN_API_KEY` → `OPENAI_API_KEY` in Supabase Dashboard Secrets.
