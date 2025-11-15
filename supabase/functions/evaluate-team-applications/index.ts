// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

interface ApplicationSummary {
  applicationId: string;
  teamId: string;
  teamName: string;
  teamSize: number;
  teamDescription?: string | null;
  memberSummaries: Array<{
    fullName: string;
    email?: string | null;
    role?: string | null;
    skills: string[];
  }>;
  combinedSkills: string[];
  matchingSkills: string[];
  missingRequiredSkills: string[];
  responses: {
    q1?: string | null;
    q2?: string | null;
  };
  subjectCode?: string | null;
  submittedAt?: string | null;
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
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const { projectId, authToken } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "Missing authToken" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify user session
    const authClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure user is admin
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch project details
    const { data: project, error: projectError } = await serviceClient
      .from("projects")
      .select("id, title, description, required_skills, preferred_skills, team_size_min, team_size_max")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) throw projectError;

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: applications, error: applicationsError } = await serviceClient
      .from("applications")
      .select("id, applicant_id, applicant_type, status, created_at")
      .eq("project_id", projectId)
      .eq("applicant_type", "team")
      .neq("status", "rejected")
      .order("created_at", { ascending: true });
    if (applicationsError) throw applicationsError;

    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({ error: "No team applications found for this project" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const applicationIds = applications.map((app) => app.id);
    const teamIds = applications.map((app) => app.applicant_id);

    const { data: responsesData } = await serviceClient
      .from("application_responses" as any)
      .select("application_id, q1, q2, subject_code")
      .in("application_id", applicationIds);

    const { data: teamsData } = await serviceClient
      .from("teams")
      .select("id, name, description")
      .in("id", teamIds);

    const { data: teamMembersData } = await serviceClient
      .from("team_members")
      .select("team_id, user_id, role")
      .in("team_id", teamIds);

    const memberUserIds = (teamMembersData || []).map((member) => member.user_id);

    const { data: profilesData } = memberUserIds.length > 0
      ? await serviceClient
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", memberUserIds)
      : { data: [] };

    const { data: studentProfilesData } = memberUserIds.length > 0
      ? await serviceClient
        .from("student_profiles")
        .select("user_id, skills")
        .in("user_id", memberUserIds)
      : { data: [] };

    const responsesMap = new Map<string, { q1?: string | null; q2?: string | null; subject_code?: string | null }>();
    (responsesData || []).forEach((response) => {
      responsesMap.set(response.application_id, { q1: response.q1, q2: response.q2, subject_code: response.subject_code });
    });

    const teamsMap = new Map<string, { name: string; description?: string | null }>();
    (teamsData || []).forEach((team) => {
      teamsMap.set(team.id, { name: team.name, description: team.description });
    });

    const profilesMap = new Map<string, { full_name: string | null; email: string | null }>();
    (profilesData || []).forEach((p) => {
      profilesMap.set(p.user_id, { full_name: p.full_name, email: p.email });
    });

    const studentProfilesMap = new Map<string, string[]>();
    (studentProfilesData || []).forEach((sp) => {
      studentProfilesMap.set(sp.user_id, Array.isArray(sp.skills) ? sp.skills : []);
    });

    const teamMembersMap = new Map<string, Array<{ user_id: string; role?: string | null }>>();
    (teamMembersData || []).forEach((member) => {
      const list = teamMembersMap.get(member.team_id) ?? [];
      list.push({ user_id: member.user_id, role: member.role });
      teamMembersMap.set(member.team_id, list);
    });

    const requiredSkills: string[] = Array.isArray(project.required_skills) ? project.required_skills : [];
    const preferredSkills: string[] = Array.isArray(project.preferred_skills) ? project.preferred_skills : [];
    const projectSkillSet = new Set([...requiredSkills, ...preferredSkills]);

    const applicationSummaries: ApplicationSummary[] = applications.map((application) => {
      const teamInfo = teamsMap.get(application.applicant_id) ?? { name: "Unnamed Team" };
      const members = teamMembersMap.get(application.applicant_id) ?? [];

      const memberSummaries = members.map((member) => {
        const profileInfo = profilesMap.get(member.user_id);
        const skills = studentProfilesMap.get(member.user_id) ?? [];
        return {
          fullName: profileInfo?.full_name ?? member.user_id,
          email: profileInfo?.email ?? null,
          role: member.role ?? null,
          skills,
        };
      });

      const combinedSkillSet = new Set<string>();
      memberSummaries.forEach((member) => {
        member.skills.forEach((skill) => combinedSkillSet.add(skill));
      });

      const combinedSkills = Array.from(combinedSkillSet);
      const matchingSkills = combinedSkills.filter((skill) => projectSkillSet.has(skill));
      const missingRequiredSkills = requiredSkills.filter((skill) => !combinedSkillSet.has(skill));
      const responses = responsesMap.get(application.id) ?? {};

      return {
        applicationId: application.id,
        teamId: application.applicant_id,
        teamName: teamInfo.name,
        teamDescription: teamInfo.description,
        teamSize: memberSummaries.length,
        memberSummaries,
        combinedSkills,
        matchingSkills,
        missingRequiredSkills,
        responses,
        subjectCode: responses.subject_code,
        submittedAt: application.created_at,
      };
    });

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPEN_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const prompt = buildEvaluationPrompt(project, applicationSummaries);

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert academic coordinator who evaluates student team applications. Always return structured JSON. Be decisive but justify recommendations with concrete evidence from the data provided.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const bestApplicationId = parsed.best_application_id ?? null;
    const ranking = Array.isArray(parsed.ordered_applications)
      ? parsed.ordered_applications.map((entry: any) => ({
        applicationId: entry.application_id ?? "",
        suitabilityScore: entry.suitability_score ?? null,
        strengths: entry.strengths ?? "",
        concerns: entry.concerns ?? "",
      }))
      : [];

    return new Response(
      JSON.stringify({
        bestApplicationId,
        ranking,
        summary: parsed.summary ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("evaluate-team-applications error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function buildEvaluationPrompt(
  project: any,
  applications: ApplicationSummary[],
): string {
  const requiredSkills = Array.isArray(project.required_skills) ? project.required_skills : [];
  const preferredSkills = Array.isArray(project.preferred_skills) ? project.preferred_skills : [];

  const applicationsMarkdown = applications.map((app, index) => {
    const memberDetails = app.memberSummaries.map((member) =>
      `- ${member.fullName} (${member.role ?? "member"}): skills ${JSON.stringify(member.skills)}`
    ).join("\n");

    const responses = [
      app.responses.q1 ? `Q1: ${app.responses.q1}` : null,
      app.responses.q2 ? `Q2: ${app.responses.q2}` : null,
    ].filter(Boolean).join("\n");

    const missingSkillsText = app.missingRequiredSkills.length > 0
      ? app.missingRequiredSkills.join(", ")
      : "None";

    return `
Application ${index + 1} — ID: ${app.applicationId}
Team Name: ${app.teamName}
Team Size: ${app.teamSize}
Team Description: ${app.teamDescription ?? "N/A"}
Subject Code: ${app.subjectCode ?? "Unknown"}
Members:
${memberDetails || "No members listed"}
Combined Skills: ${app.combinedSkills.join(", ") || "None"}
Matching Project Skills: ${app.matchingSkills.join(", ") || "None"}
Missing Required Skills: ${missingSkillsText}
Responses:
${responses || "No responses provided"}
Submitted At: ${app.submittedAt ?? "Unknown"}
`;
  }).join("\n---\n");

  return `
Project Title: ${project.title}
Project Description: ${project.description ?? "N/A"}
Required Skills: ${requiredSkills.join(", ") || "None"}
Preferred Skills: ${preferredSkills.join(", ") || "None"}
Target Team Size: ${project.team_size_min ?? "?"} - ${project.team_size_max ?? "?"} members

Team Applications:
${applicationsMarkdown}

Task:
1. Evaluate each team based on skill coverage, team balance, size fit, application responses, and potential risks.
2. Rank all teams from strongest to weakest. Assign each a suitability_score from 0-100 (higher is better).
3. Highlight specific strengths and concerns for each team.
4. Select the single best_application_id to recommend.

Output strict JSON with:
{
  "best_application_id": "<id>",
  "summary": "<2-3 sentence overview>",
  "ordered_applications": [
    {
      "application_id": "<id>",
      "suitability_score": <number>,
      "strengths": "<concise strengths>",
      "concerns": "<concise risks or missing skills>"
    }
  ]
}
`.trim();
}

