// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

interface ExtractionResult {
  firstName?: string;
  lastName?: string;
  fieldOfStudy?: string;
  academicLevel?: string;
  wam?: number;
  skills?: string[];
  interests?: string[];
  courses?: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching file from:", url);
    
    // Fetch the file
    const fileResp = await fetch(url);
    if (!fileResp.ok) {
      throw new Error(`Failed to fetch file: ${fileResp.status} ${fileResp.statusText}`);
    }

    const fileBuffer = await fileResp.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    console.log("File size:", fileBytes.length, "bytes");
    console.log("Content type:", fileResp.headers.get("content-type"));

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    // Determine file type and process accordingly
    const contentType = fileResp.headers.get("content-type") || "";
    const isPdf = contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf");
    
    let extractedText = "";
    let result: ExtractionResult = {};
    
    if (isPdf) {
      // For PDF files, extract text first, then use OpenAI text API
      console.log("Processing PDF file");
      try {
        // Extract readable text from PDF
        extractedText = await extractTextFromPdf(fileBytes);
        
        if (extractedText.length < 50) {
          throw new Error("Could not extract sufficient text from PDF. The PDF may be image-based or corrupted.");
        }
        
        // Use OpenAI to structure the extracted text
        console.log("Extracted text length:", extractedText.length);
        result = await extractWithOpenAIText(extractedText, openaiApiKey);
      } catch (pdfError: any) {
        console.error("PDF processing error:", pdfError);
        throw new Error(`PDF processing failed: ${pdfError.message}`);
      }
    } else {
      // For image files (JPG, PNG, etc.), use OpenAI Vision API
      console.log("Processing as image file");
      result = await extractWithOpenAIVision(fileBytes, openaiApiKey);
    }

    console.log("Final extraction result:", result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Extraction failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Extract text from PDF bytes using a simple text extraction approach
 */
async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  // Convert to string for regex matching
  const decoder = new TextDecoder("latin1", { fatal: false });
  const pdfString = decoder.decode(pdfBytes);
  
  // Extract text streams from PDF (common PDF structure)
  const textMatches: string[] = [];
  
  // Method 1: Extract text from PDF streams (BT...ET blocks)
  const streamPattern = /stream\s*(.*?)\s*endstream/gis;
  let match;
  while ((match = streamPattern.exec(pdfString)) !== null) {
    const streamContent = match[1];
    // Extract readable text from stream
    const textPattern = /[A-Za-z][A-Za-z0-9\s.,;:!?@#$%^&*()\-_=+\[\]{}|'"/\\`~<>]{3,}/g;
    const matches = streamContent.match(textPattern);
    if (matches) {
      textMatches.push(...matches.filter(t => /[a-zA-Z]{2,}/.test(t)));
    }
  }
  
  // Method 2: Extract text from parentheses (common in PDF text objects)
  const parenPattern = /\((.*?)\)/g;
  while ((match = parenPattern.exec(pdfString)) !== null) {
    const text = match[1];
    if (text.length > 2 && /[a-zA-Z]/.test(text) && !text.includes("\\")) {
      textMatches.push(text);
    }
  }
  
  // Method 3: Extract any readable ASCII sequences
  if (textMatches.length < 100) {
    const asciiPattern = /[A-Za-z][A-Za-z0-9\s.,;:!?\-]{10,}/g;
    const asciiMatches = pdfString.match(asciiPattern);
    if (asciiMatches) {
      textMatches.push(...asciiMatches.filter(t => 
        !/[^\x20-\x7E\n]/.test(t) && t.trim().length > 5
      ));
    }
  }
  
  // Combine and clean text
  let extractedText = textMatches
    .filter(t => t.trim().length > 2)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add spaces between camelCase
        .trim()
    .slice(0, 15000); // Limit to 15k chars
  
  return extractedText;
}

/**
 * Extract information from text using OpenAI Chat API
 */
async function extractWithOpenAIText(text: string, apiKey: string): Promise<ExtractionResult> {
  const prompt = `Extract the following information from this resume text and return ONLY a valid JSON object with these exact keys:
- firstName (string): Person's first name
- lastName (string): Person's last name  
- fieldOfStudy (string): Their field/major of study (e.g., "Computer Science", "Engineering", etc.)
- academicLevel (string): One of "undergraduate", "masters", "phd", or "other"
- wam (number): Weighted Average Mark or GPA as a number between 0-100 (if found, otherwise null)
- skills (array of strings): Technical skills, programming languages, tools, etc.
- interests (array of strings): Areas of interest, hobbies, research interests
- courses (array of strings): Course codes like "COMP3900", "MATH1001", etc.

Return ONLY the JSON object, no markdown formatting, no explanation, no code blocks.

Resume text:
${text}`;

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
          content: "You are a resume parser. Extract structured information and return ONLY valid JSON. No markdown, no explanations, just the JSON object."
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
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  
  console.log("OpenAI response:", content);

  try {
    // Clean up the response (remove markdown code blocks if any)
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
            const parsed = JSON.parse(cleaned);
    
    // Validate and normalize the result
    return {
      firstName: parsed.firstName || undefined,
      lastName: parsed.lastName || undefined,
      fieldOfStudy: parsed.fieldOfStudy || undefined,
      academicLevel: parsed.academicLevel || undefined,
      wam: typeof parsed.wam === "number" ? parsed.wam : undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s: any) => typeof s === "string") : undefined,
      interests: Array.isArray(parsed.interests) ? parsed.interests.filter((i: any) => typeof i === "string") : undefined,
      courses: Array.isArray(parsed.courses) ? parsed.courses.filter((c: any) => typeof c === "string") : undefined,
    };
  } catch (parseError: any) {
    console.error("Failed to parse OpenAI response:", parseError);
    console.error("Raw content:", content);
    throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
  }
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Extract information from image using OpenAI Vision API
 * Note: This only works for image files (JPG, PNG, etc.), not PDFs
 */
async function extractWithOpenAIVision(fileBytes: Uint8Array, apiKey: string): Promise<ExtractionResult> {
  // Convert to base64
  const base64 = uint8ArrayToBase64(fileBytes);
  
  // Determine MIME type for images
  // Try to detect from file header
  const header = Array.from(fileBytes.slice(0, 4))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  let mimeType = "image/jpeg"; // Default
  if (header.startsWith("89504e47")) mimeType = "image/png";
  else if (header.startsWith("ffd8ff")) mimeType = "image/jpeg";
  else if (header.startsWith("474946")) mimeType = "image/gif";
  else if (header.startsWith("25504446")) {
    throw new Error("PDF files are not supported by Vision API. Please upload a PDF file instead.");
  }
  
  const prompt = `Extract the following information from this resume and return ONLY a valid JSON object with these exact keys:
- firstName (string): Person's first name
- lastName (string): Person's last name  
- fieldOfStudy (string): Their field/major of study (e.g., "Computer Science", "Engineering", etc.)
- academicLevel (string): One of "undergraduate", "masters", "phd", or "other"
- wam (number): Weighted Average Mark or GPA as a number between 0-100 (if found, otherwise null)
- skills (array of strings): Technical skills, programming languages, tools, etc.
- interests (array of strings): Areas of interest, hobbies, research interests
- courses (array of strings): Course codes like "COMP3900", "MATH1001", etc.

Return ONLY the JSON object, no markdown formatting, no explanation, no code blocks.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a resume parser. Extract structured information from resumes and return ONLY valid JSON. No markdown, no explanations, just the JSON object."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI Vision API error:", errorText);
    throw new Error(`OpenAI Vision API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  
  console.log("OpenAI Vision response:", content);

  try {
    // Clean up the response
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const parsed = JSON.parse(cleaned);
    
    // Validate and normalize the result
    return {
      firstName: parsed.firstName || undefined,
      lastName: parsed.lastName || undefined,
      fieldOfStudy: parsed.fieldOfStudy || undefined,
      academicLevel: parsed.academicLevel || undefined,
      wam: typeof parsed.wam === "number" ? parsed.wam : undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s: any) => typeof s === "string") : undefined,
      interests: Array.isArray(parsed.interests) ? parsed.interests.filter((i: any) => typeof i === "string") : undefined,
      courses: Array.isArray(parsed.courses) ? parsed.courses.filter((c: any) => typeof c === "string") : undefined,
    };
  } catch (parseError: any) {
    console.error("Failed to parse OpenAI Vision response:", parseError);
    console.error("Raw content:", content);
    throw new Error(`Failed to parse OpenAI Vision response: ${parseError.message}`);
  }
}
