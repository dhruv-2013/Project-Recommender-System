# Sample CSV File for Project Import

## 📄 File: `sample-projects.csv`

This CSV file contains **20 sample projects** that you can use to test the CSV import functionality.

## 📋 CSV Format

The CSV has the following columns:
- **Project Name**: Title of the project
- **Description**: Detailed project description
- **Skills**: Comma-separated list of required/preferred skills
- **Category**: Project category (Web Development, AI/ML, Mobile Development, etc.)
- **Duration**: Estimated project duration (e.g., "10-14 weeks")
- **Difficulty**: Difficulty level (Beginner, Intermediate, Advanced)

## 🚀 How to Use

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to Admin Dashboard**:
   - Go to: `http://localhost:8082/admin` (or your server URL)
   - Login as admin

3. **Click "Projects" tab**

4. **Click "Import CSV" button**

5. **Select the file**: Choose `sample-projects.csv` from your project folder

6. **Wait for processing**: The system will:
   - Process each row using GPT
   - Extract structured project data
   - Import projects into the database

7. **Review imported projects**: 
   - Projects will be imported as **unpublished** by default
   - You can edit and publish them individually
   - Check that all fields were extracted correctly

## 📝 Notes

- The AI will intelligently extract and structure the data from the CSV
- Skills will be split into required/preferred skills automatically
- Category and difficulty will be inferred if not explicitly stated
- All projects will default to:
  - Capacity: 1 team
  - Team size: 1-4 members
  - Published: false (you can publish after review)

## 🔄 Converting Excel to CSV

If you have an Excel file (.xlsx), convert it to CSV:

**Option 1: Using Excel**
1. Open your Excel file
2. Go to File → Save As
3. Choose "CSV (Comma delimited) (*.csv)"
4. Save the file

**Option 2: Using Google Sheets**
1. Upload Excel file to Google Sheets
2. File → Download → Comma-separated values (.csv)

## ✏️ Customizing the CSV

You can edit `sample-projects.csv` to add your own projects. The AI will handle various formats, but it's recommended to include:
- Project name/title
- Description (the more detailed, the better)
- Skills (comma-separated)
- Category (optional - AI will infer)
- Duration (optional)
- Difficulty (optional - defaults to Intermediate)

## ✅ Expected Result

After importing, you should see:
- Success message showing number of projects imported
- All 20 projects in the Projects list (unpublished)
- Properly extracted fields (title, description, skills, category, etc.)

## 🐛 Troubleshooting

If import fails:
1. Check browser console (F12) for errors
2. Verify CSV format is correct (commas separating values)
3. Make sure you're logged in as admin
4. Check Supabase Edge Function logs for detailed errors
