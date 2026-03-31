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


// 🧠 SMART MATCHING (NEW LOGIC)
function findBestMatch(query) {
  query = query.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (let item of kb.qa) {
    const question = item.question.toLowerCase();

    let score = 0;

    const queryWords = query.split(" ");
    const questionWords = question.split(" ");

    for (let word of queryWords) {
      if (questionWords.includes(word)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  // ✅ threshold (important)
  if (bestScore >= 2) {
    return bestMatch;
  }

  return null;
}


// 🤖 Groq AI
async function askGroq(query) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192", // ✅ updated model
      messages: [
        {
          role: "system",
          content: `
You are a helpful AI assistant.
Give direct and natural answers.
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
    console.error("Groq error:", error.message);

    // fallback simple answer
    return "I'm having trouble answering that right now, but please try again.";
  }
}


// 🚀 MAIN API
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // 1️⃣ Smart KB matching
  const match = findBestMatch(message);

  if (match) {
    return res.json({
      source: "knowledge_base",
      answer: match.answer
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
  res.send("UrbanEase AI Backend Running 🚀");
});


// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
