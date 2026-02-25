import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Question from "./models/questions.js";

dotenv.config();
const app = express();

/* ===============================
   CONFIG
================================ */
const STOP_WORDS = new Set([
    "the","is","are","was","were","a","an","of","to","in","on","for",
    "with","and","or","by","what","why","how","explain","define"
]);

/* ===============================
   TEXT UTILS
================================ */
function normalize(text = "") {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(text) {
    return normalize(text)
        .split(" ")
        .filter(w => w && !STOP_WORDS.has(w));
}

/* ===============================
   FUZZY MATCH (cheap + fast)
================================ */
function editDistance1(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let diff = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] !== b[i]) diff++;
        if (diff > 1) return false;
    }
    return true;
}

/* ===============================
   IN-MEMORY INDEX
================================ */
let INDEX = [];
let GLOBAL_FREQ = {};

async function buildIndex() {
    const docs = await Question.find({ question: { $type: "string" } }).lean();

    GLOBAL_FREQ = {};
    INDEX = docs.map(q => {
        const tokens = tokenize(q.question);
        tokens.forEach(t => {
            GLOBAL_FREQ[t] = (GLOBAL_FREQ[t] || 0) + 1;
        });

        return {
            ...q,
            _normQuestion: normalize(q.question),
            _tokens: tokens,
            _topicTokens: tokenize(q.topic || ""),
            _subjectTokens: tokenize(q.subject || "")
        };
    });
    // console.log(INDEX)
    console.log(`🔍 Search index built (${INDEX.length} questions)`);
}

/* ===============================
   SCORING (GOOGLE-LIKE)
================================ */
function scoreDoc(query, queryTokens, doc) {
    let score = 0;

    // 1️⃣ Exact phrase
    if (doc._normQuestion.includes(query)) {
        score += 20;
    }

    // 2️⃣ Token matches (weighted)
    for (const qt of queryTokens) {

        if (doc._tokens.includes(qt)) {
            score += 8 / (GLOBAL_FREQ[qt] || 1);
            continue;
        }

        // fuzzy fallback
        for (const dt of doc._tokens) {
            if (dt.length >= 4 && editDistance1(qt, dt)) {
                score += 2;
                break;
            }
        }

        // field boosts
        if (doc._topicTokens.includes(qt)) score += 4;
        if (doc._subjectTokens.includes(qt)) score += 3;
    }

    return score;
}

/* ===============================
   SEARCH
================================ */
function search(query) {
    const normalizedQuery = normalize(query);
    const queryTokens = tokenize(query);
    if (!queryTokens.length) return [];

    return INDEX
        .map(doc => {
            const score = scoreDoc(normalizedQuery, queryTokens, doc);
            return score > 0 ? { ...doc, _score: score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b._score - a._score)
        .slice(0, 10);
}

/* ===============================
   APP SETUP
================================ */
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   ROUTES
================================ */
app.get("/", (req, res) => res.render("home"));

app.post("/process-prompt", (req, res) => {
    const { prompt } = req.body;
    if (!prompt?.trim()) {
        return res.json({ success: true, results: [] });
    }

    const results = search(prompt);
    res.json({ success: true, results });
});

app.get("/solution/:id", async (req, res) => {
    const q = await Question.findById(req.params.id).lean();
    if (!q) return res.status(404).render("404");
    res.render("solution", { question: q });
});

/* ===============================
   START
================================ */
connectDB().then(buildIndex);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
    console.log(`🚀 http://localhost:${PORT}`)
);