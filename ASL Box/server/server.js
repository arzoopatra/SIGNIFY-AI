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
app.get("/api/letter-msg", async (req, res) => {
  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages: [
        {
          role: "user",
          content: "Write a short emotional motivational message under 8 words."
        }
      ]
    });

    res.json({
      message: response.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.json({ message: "Keep learning 💙" });
  }
});

app.get("/api/asl-tip", async (req, res) => {
  try {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages: [
        {
          role: "user",
          content: "Give a very short ASL learning tip in under 8 words."
        }
      ],
      max_tokens: 20
    });

    res.json({
      tip: response.choices[0].message.content
    });

  } catch {
    res.json({ tip: "Practice daily 💙" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});