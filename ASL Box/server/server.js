import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());

// ✅ OpenRouter via OpenAI SDK (BEST WAY)
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

// HOME ROUTE
app.get("/", (req, res) => {
  res.send("🚀 OpenRouter server running");
});

// AI ROUTE
app.get("/api/asl-tip", async (req, res) => {
  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct", // ✅ FREE
      messages: [
        {
          role: "user",
          content: "Give a unique beginner-friendly ASL tip in 1 short sentence. Do not repeat common tips."
        }
      ]
    });

    const tip = response.choices[0].message.content;

    res.json({ tip });

  } catch (err) {
    console.error(err);
    res.json({ error: "OpenRouter failed" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});