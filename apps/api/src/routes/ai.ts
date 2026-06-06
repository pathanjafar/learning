import { Router } from "express";

export const aiRouter = Router();

aiRouter.post("/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return res.status(400).json({
      error: "GEMINI_API_KEY is not configured",
      details: "Please add your GEMINI_API_KEY in the root .env file and restart the server.",
    });
  }

  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  let contextInstruction = "";
  if (context) {
    if (context.type === "problem") {
      contextInstruction = `\n\nCURRENT WEBPAGE CONTEXT:
The user is currently viewing/solving a programming problem.
- Title: ${context.title}
- Statement: ${context.statement}
- Current language chosen: ${context.language}
- Current code in the user's editor:
\`\`\`${context.language}
${context.code}
\`\`\`
Use this context to help answer questions. If they ask for hints, refer to this problem context. If their code has bugs, help point out the logic issues without giving a direct solution.`;
    } else if (context.type === "lesson") {
      contextInstruction = `\n\nCURRENT WEBPAGE CONTEXT:
The user is currently reading a learning lesson.
- Title: ${context.title}
- Lesson content: ${context.content}
Use this context to answer questions about the lesson.`;
    }
  }

  // Prepend our system instruction to guide the tutor bot's responses
  const systemInstruction = {
    parts: [
      {
        text: "You are Reborn AI, an expert software developer and DSA tutor on the Reborn platform. " +
          "Help the student with conceptual explanations, debugging code, understanding algorithms, " +
          "or career tips. Keep explanations concise, clear, and structured. " +
          "Always use Markdown formatting. Under no circumstances should you solve a complete " +
          "problem for the student directly; instead, provide helpful hints, explain the logic/math, " +
          "point out edge cases, or show a simplified example." +
          contextInstruction
      }
    ]
  };


  // Convert standard chat message format (role: user/assistant) to Gemini API format (role: user/model)
  const contents = messages
    .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
    .map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content || "" }],
    }));

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", errorData);
      return res.status(response.status).json({
        error: "Failed to communicate with Gemini API",
        details: errorData?.error?.message || response.statusText,
      });
    }

    const data: any = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    return res.json({ reply });
  } catch (err: any) {
    console.error("Internal Chat Error:", err);
    return res.status(500).json({
      error: "An internal server error occurred while contacting AI.",
      details: err.message,
    });
  }
});
