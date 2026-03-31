const express = require("express");
const cors = require("cors");
require("dotenv").config();

const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Load Knowledge Base
const kb = require("./urbanease-kb.json");

// ✅ Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 🔍 Check if UrbanEase query
function isUrbanEaseQuery(query) {
  query = query.toLowerCase();

  for (let key in kb.keywords) {
    const keywords = kb.keywords[key];

    for (let word of keywords) {
      if (query.includes(word)) {
        return key;
      }
    }
  }
  return null;
}

// 📦 Get answer from KB
function getAnswer(category) {
  return kb.qa.find(q => q.category === category);
}

// 🤖 Smart fallback (NO error message)
function getSimpleAnswer(query) {
  query = query.toLowerCase();

  if (query.includes("tesla")) {
    return "Tesla is an American company that manufactures electric vehicles and clean energy products.";
  }

  if (query.includes("ai")) {
    return "Artificial Intelligence is the simulation of human intelligence in machines.";
  }

  if (query.includes("google")) {
    return "Google is a multinational technology company specializing in internet services.";
  }

  return "Here’s a general answer: " + query;
}

// 🤖 Groq AI (with retry + fallback)
async function askGroq(query) {
  try {
    // ✅ First attempt
    const response = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: `
You are a helpful AI assistant.
Give direct and clear answers.
Do NOT say "according to".
`
        },
        {
          role: "user",
          content: query
        }
      ],
    });

    return response.choices[0].message.content;

  } catch (error) {
    console.log("First attempt failed, retrying...");

    try {
      // 🔁 Retry once
      const retry = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "user",
            content: query
          }
        ],
      });

      return retry.choices[0].message.content;

    } catch (error2) {
      console.error("Groq failed again:", error2.message);

      // ✅ Final fallback (NO error shown)
      return getSimpleAnswer(query);
    }
  }
}

// 🚀 MAIN API
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // 1️⃣ Check UrbanEase KB
  const category = isUrbanEaseQuery(message);

  if (category) {
    const answer = getAnswer(category);

    return res.json({
      source: "knowledge_base",
      answer: answer.answer
    });
  }

  // 2️⃣ Otherwise → Groq
  const groqResponse = await askGroq(message);

  res.json({
    source: "groq",
    answer: groqResponse
  });
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
