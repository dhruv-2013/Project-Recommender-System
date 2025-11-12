// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

interface ProjectData {
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  estimated_duration: string;
  capacity?: number;
  team_size_min?: number;
  team_size_max?: number;
  required_skills?: string[];
  preferred_skills?: string[];
  learning_outcomes?: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { csvContent, authToken } = await req.json();
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: "Missing csvContent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "Missing authToken" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    // Verify user token - use anon key if available, otherwise service key
    const keyToVerify = supabaseAnonKey || supabaseServiceKey;
    const supabaseAuth = createClient(supabaseUrl, keyToVerify, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key to check profile (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse CSV
    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data found in CSV" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OpenAI API key (try both possible names)
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPEN_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY or OPEN_API_KEY environment variable is not set");
    }

    // Process rows in batches to avoid overwhelming the API
    const batchSize = 10;
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (row, index) => {
          try {
            const projectData = await extractProjectDataFromRow(row, openaiApiKey);
            
            if (projectData && projectData.title && projectData.description) {
              // Insert into database
              const { error } = await supabase
                .from("projects")
                .insert({
                  title: projectData.title,
                  description: projectData.description,
                  category: projectData.category || "General",
                  difficulty_level: projectData.difficulty_level || "Intermediate",
                  estimated_duration: projectData.estimated_duration || "8-12 weeks",
                  capacity: projectData.capacity || 1,
                  team_size_min: projectData.team_size_min || 1,
                  team_size_max: projectData.team_size_max || 4,
                  required_skills: projectData.required_skills || [],
                  preferred_skills: projectData.preferred_skills || [],
                  learning_outcomes: projectData.learning_outcomes || [],
                  published: false, // Default to unpublished, admin can review first
                });

              if (error) {
                throw error;
              }
              results.success++;
            } else {
              throw new Error("Missing required fields (title or description)");
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push(`Row ${i + index + 1}: ${error?.message || "Unknown error"}`);
          }
        })
      );
    }

    return new Response(
      JSON.stringify({
        message: "Import completed",
        total: rows.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors.slice(0, 10), // Limit errors returned
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse CSV content into rows
 */
function parseCSV(csvContent: string): string[][] {
  const rows: string[][] = [];
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  
  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim()); // Add last field
    
    if (row.length > 0 && row.some(cell => cell.length > 0)) {
      rows.push(row);
    }
  }
  
  return rows;
}

/**
 * Extract structured project data from a CSV row using GPT
 */
async function extractProjectDataFromRow(row: string[], apiKey: string): Promise<ProjectData | null> {
  // Create a prompt that includes all row data
  const rowData = row.join(", ");
  
  const prompt = `Extract project information from this CSV row data and return ONLY a valid JSON object with these exact keys:
- title (string, required): Project title
- description (string, required): Detailed project description
- category (string): One of "Web Development", "Mobile Development", "Data Science", "AI/ML", "DevOps", or "General"
- difficulty_level (string): One of "Beginner", "Intermediate", or "Advanced"
- estimated_duration (string): Estimated time like "4 weeks", "8-12 weeks", "3 months"
- capacity (number, optional): Number of teams that can work on this (default 1)
- team_size_min (number, optional): Minimum team size (default 1)
- team_size_max (number, optional): Maximum team size (default 4)
- required_skills (array of strings): Essential skills needed
- preferred_skills (array of strings): Nice-to-have skills
- learning_outcomes (array of strings): What students will learn

CSV Row Data: ${rowData}

Return ONLY the JSON object, no markdown formatting, no explanation, no code blocks.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a project data extractor. Extract structured project information from CSV data and return ONLY valid JSON. No markdown, no explanations, just the JSON object."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "{}";

    // Clean up the response
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate and normalize
    return {
      title: parsed.title || "",
      description: parsed.description || "",
      category: parsed.category || "General",
      difficulty_level: parsed.difficulty_level || "Intermediate",
      estimated_duration: parsed.estimated_duration || "8-12 weeks",
      capacity: typeof parsed.capacity === "number" ? parsed.capacity : 1,
      team_size_min: typeof parsed.team_size_min === "number" ? parsed.team_size_min : 1,
      team_size_max: typeof parsed.team_size_max === "number" ? parsed.team_size_max : 4,
      required_skills: Array.isArray(parsed.required_skills) 
        ? parsed.required_skills.filter((s: any) => typeof s === "string")
        : [],
      preferred_skills: Array.isArray(parsed.preferred_skills)
        ? parsed.preferred_skills.filter((s: any) => typeof s === "string")
        : [],
      learning_outcomes: Array.isArray(parsed.learning_outcomes)
        ? parsed.learning_outcomes.filter((s: any) => typeof s === "string")
        : [],
    };
  } catch (error: any) {
    console.error("Failed to extract project data:", error);
    return null;
  }
}
