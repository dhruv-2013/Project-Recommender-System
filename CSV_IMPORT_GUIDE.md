# CSV Import Feature Guide

## Where to Find the Feature

1. **Login as Admin**: Make sure you're logged in with an admin account
2. **Navigate to Admin Dashboard**: Go to `/admin` route
3. **Click on "Projects" Tab**: This should be the first tab in the admin dashboard
4. **Look for "Import CSV" Button**: Next to the "Create Project" button, you'll see an "Import CSV" button

## How to Use

1. Click the **"Import CSV"** button
2. A dialog will open with a file input
3. Select a CSV file from your computer
4. The system will:
   - Process the CSV file
   - Use GPT to extract project information from each row
   - Import all projects into the database
   - Show you a success message with import statistics

## Testing the Feature

### Step 1: Deploy the Edge Function

First, make sure the edge function is deployed to Supabase:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (if not already linked)
supabase link --project-ref esqnspdjyaamlycrools

# Deploy the function
supabase functions deploy import-projects-csv
```

### Step 2: Set Environment Variables

Make sure these secrets are set in your Supabase project:

1. Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
2. Add these secrets:
   - `OPENAI_API_KEY` - Your OpenAI API key

The following are automatically available:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

### Step 3: Create a Test CSV File

Create a file called `test-projects.csv` with this content:

```csv
Project Name,Description,Skills,Category,Duration
AI Chatbot Application,"Build a conversational AI chatbot using natural language processing","Python, NLP, TensorFlow, Flask","AI/ML","8-12 weeks"
E-Commerce Platform,"Develop a full-stack e-commerce website with payment integration","React, Node.js, PostgreSQL, Stripe API","Web Development","10-14 weeks"
Mobile Fitness Tracker,"Create a mobile app to track fitness activities and nutrition","React Native, Firebase, JavaScript","Mobile Development","12-16 weeks"
Data Analytics Dashboard,"Build a dashboard for analyzing sales data with visualizations","Python, Pandas, React, D3.js","Data Science","6-10 weeks"
Cloud DevOps Pipeline,"Set up CI/CD pipeline using Docker and Kubernetes","Docker, Kubernetes, Jenkins, AWS","DevOps","8-12 weeks"
```

### Step 4: Test the Import

1. Start your development server: `npm run dev`
2. Login as admin
3. Navigate to Admin → Projects tab
4. Click "Import CSV"
5. Upload your `test-projects.csv` file
6. Wait for processing (you'll see a progress bar)
7. Check the success message

### Step 5: Verify Imported Projects

1. In the Projects tab, you should see the newly imported projects
2. They will be marked as **unpublished** (you can edit and publish them manually)
3. Check that all fields were extracted correctly:
   - Title
   - Description
   - Category
   - Skills (required and preferred)
   - Duration
   - Difficulty level

## Troubleshooting

### Function Not Found Error

If you get a "Function not found" error:
- The edge function may not be deployed yet
- Run: `supabase functions deploy import-projects-csv`

### Authentication Error

If you get an authentication error:
- Make sure you're logged in as an admin user
- Check that your email contains "admin" or is in the admin list

### OpenAI API Error

If you get an OpenAI API error:
- Check that `OPENAI_API_KEY` secret is set in Supabase
- Verify your OpenAI API key is valid and has credits

### Import Fails

If import fails:
- Check the browser console for detailed error messages
- Verify your CSV format is correct
- Make sure the CSV has at least a project name/description column

## CSV Format Tips

The AI is flexible and can extract information from various CSV formats. However, try to include:

- **Project name/title** (required)
- **Description** (recommended)
- **Skills** (can be comma-separated)
- **Category** (optional, AI will infer if missing)
- **Duration** (optional)
- **Difficulty** (optional, defaults to Intermediate)

The GPT model will intelligently extract and structure this information!

## Checking if Function is Deployed

You can check if the function is deployed by:

1. **Supabase Dashboard**: Go to Edge Functions section and look for `import-projects-csv`
2. **Test via curl**:
   ```bash
   curl -X POST https://esqnspdjyaamlycrools.supabase.co/functions/v1/import-projects-csv \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"csvContent":"test,test","authToken":"YOUR_ACCESS_TOKEN"}'
   ```

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase Edge Function logs: Dashboard → Edge Functions → import-projects-csv → Logs
3. Verify all environment variables are set correctly
