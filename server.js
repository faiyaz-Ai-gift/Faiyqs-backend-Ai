import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 5000;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "AI backend is running" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, useWeb = false } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

    const tools = useWeb ? [{ type: "web_search_preview" }] : undefined;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: message,
      tools
    });

    res.json({ text: response.output_text || "No response generated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || "AI request failed" });
  }
});

app.post("/api/image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt is required" });

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });

    const item = result.data?.[0];
    if (!item) throw new Error("No image returned");

    if (item.b64_json) {
      return res.json({ image: `data:image/png;base64,${item.b64_json}` });
    }
    res.json({ image: item.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || "Image generation failed" });
  }
});

app.post("/api/website", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Website request is required" });

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: `You are an expert web developer. Build a complete single-file website from this request:
${prompt}

Return ONLY valid HTML. Include CSS and JavaScript inside the same HTML file. Make it responsive, polished, accessible, and functional. Do not use markdown fences.`
    });

    let html = response.output_text || "";
    html = html.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    res.json({ html });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || "Website generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
