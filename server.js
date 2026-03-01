import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Question from "./models/questions.js";
import Profile from "./models/user_profile.js";
import session from "express-session";
import emailjs from "@emailjs/nodejs";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

/* =====================================================
   SESSION (FIXED - NO GLOBAL VARIABLES)
===================================================== */

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

/* =====================================================
   BASIC SETUP
===================================================== */

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   AI CONFIG
===================================================== */

const SYSTEM_PROMPT = `
You are an answer engine.

Rules:
- Answer ONLY what is asked.
- Do NOT add introductions or conclusions.
- Explain step-by-step clearly.
`;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

/* =====================================================
   SIGNUP
===================================================== */

app.get("/signup", (req, res) => {
    res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
    try {
        const { name, email, age, phone, password, role } = req.body;

        const exists = await Profile.findOne({ email });
        if (exists) {
            return res.render("signup", {
                error: "Email already registered."
            });
        }

        // Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000);

        // Store TEMP signup in session
        req.session.pendingUser = {
            name,
            email,
            age,
            phone,
            password,
            role,
            otp,
            expires: Date.now() + 10 * 60 * 1000,
            resendAllowedAt: Date.now() + 5 * 60 * 1000
        };

        // Send OTP
        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_VERIF_TEMPLATE_ID,
            {
                email,
                otp,
                name
            },
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY
            }
        );

        console.log(`OTP sent to ${email}: ${otp}`);

        return res.redirect("/email_verification");

    } catch (err) {
        console.error("Signup error:", err);
        res.render("signup", { error: "Signup failed." });
    }
});

/* =====================================================
   EMAIL VERIFICATION
===================================================== */

app.get("/email_verification", (req, res) => {
    const data = req.session.pendingUser;

    if (!data) {
        return res.redirect("/signup");
    }

    res.render("email_verification", {
        error: null,
        email: data.email,
        expires: data.expires,
        resendAllowedAt: data.resendAllowedAt
    });
});

app.post("/email_verification", async (req, res) => {
    try {
        const { otp } = req.body;
        const data = req.session.pendingUser;

        if (!data) {
            return res.redirect("/signup");
        }

        if (Date.now() > data.expires) {
            delete req.session.pendingUser;
            return res.render("email_verification", {
                error: "OTP expired. Please signup again.",
                email: data.email
            });
        }

        if (String(otp) !== String(data.otp)) {
            return res.render("email_verification", {
                error: "Invalid OTP.",
                email: data.email
            });
        }

        // OTP correct → create user NOW
        await Profile.create({
            name: data.name,
            email: data.email,
            pin: data.password,
            mobile_number: data.phone,
            age: data.age,
            tier_type: "free_tier",
            role: data.role,
            questions_attempted: 0
        });

        delete req.session.pendingUser;

        res.redirect("/signin");

    } catch (err) {
        console.error("Verification error:", err);
        res.redirect("/signup");
    }
});
app.post("/resend-otp", async (req, res) => {
    try {
        const data = req.session.pendingUser;

        if (!data) return res.redirect("/signup");

        if (Date.now() < data.resendAllowedAt) {
            const waitTime = Math.ceil(
                (data.resendAllowedAt - Date.now()) / 1000
            );

            return res.render("email_verification", {
                error: `Please wait ${waitTime}s before resending OTP.`,
                email: data.email
            });
        }

        const newOtp = Math.floor(1000 + Math.random() * 9000);

        data.otp = newOtp;
        data.expires = Date.now() + 10 * 60 * 1000;
        data.resendAllowedAt = Date.now() + 5 * 60 * 1000;

        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_VERIF_TEMPLATE_ID,
            {
                email: data.email,
                otp: newOtp,
                name: data.name
            },
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY
            }
        );

        console.log("OTP resent:", newOtp);

        res.render("email_verification", {
            error: "New OTP sent.",
            email: data.email,
            expires: data.expires,
            resendAllowedAt: data.resendAllowedAt
        });

    } catch (err) {
        console.error("Resend error:", err);
        res.redirect("/signup");
    }
});
/* =====================================================
   SIGNIN
===================================================== */

app.get("/signin", (req, res) => {
    res.render("signin", { error: null });
});

app.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    const user = await Profile.findOne({ email });

    if (!user || String(user.pin) !== String(password)) {
        return res.render("signin", {
            error: "Invalid credentials."
        });
    }

    req.session.userId = user._id;

    res.redirect("/home");
});

/* =====================================================
   HOME
===================================================== */

app.get("/home", (req, res) => {
    if (!req.session.userId) return res.redirect("/signin");
    res.render("home");
});

/* =====================================================
   SEARCH SYSTEM (UNCHANGED)
===================================================== */

const STOP_WORDS = new Set([
    "the","is","are","was","were","a","an","of","to","in","on","for",
    "with","and","or","by","what","why","how","explain","define"
]);

function normalize(text = "") {
    return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text) {
    return normalize(text).split(" ").filter(w => w && !STOP_WORDS.has(w));
}

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
            _tokens: tokens
        };
    });

    console.log(`Search index built (${INDEX.length})`);
}

function scoreDoc(query, queryTokens, doc) {
    let score = 0;

    if (doc._normQuestion.includes(query)) score += 20;

    for (const qt of queryTokens) {
        if (doc._tokens.includes(qt)) {
            score += 8 / (GLOBAL_FREQ[qt] || 1);
        }
    }

    return score;
}

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

app.post("/process-prompt", (req, res) => {
    const { prompt } = req.body;
    if (!prompt?.trim()) {
        return res.json({ success: true, results: [] });
    }

    const results = search(prompt);
    res.json({ success: true, results });
});

/* =====================================================
   AI
===================================================== */

async function fetchAiResult(question) {
    const prompt = `${SYSTEM_PROMPT}\n\nQuestion:\n${question}`;

    const response = await ai.models.generateContent({
        model: "gemma-3-1b-it",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.2
        }
    });

    return response?.candidates?.[0]?.content?.parts
        ?.map(p => p.text)
        .join("") || "No response";
}

app.post("/ai-answer", async (req, res) => {
    try {
        const { question } = req.body;
        const answer = await fetchAiResult(question);
        res.json({ success: true, answer });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
/* =====================================================
   FORGOT PASSWORD
===================================================== */

app.get("/forgot_password", (req, res) => {
    res.render("forgot_password", { error: null });
});

app.post("/forgot_password", async (req, res) => {
    try {
        const { email } = req.body;

        const user = await Profile.findOne({ email });

        if (!user) {
            return res.render("forgot_password", {
                error: "Email not registered."
            });
        }

        const otp = Math.floor(1000 + Math.random() * 9000);

        req.session.resetData = {
            email,
            otp,
            expires: Date.now() + 10 * 60 * 1000,
            resendAllowedAt: Date.now() + 5 * 60 * 1000
        };

        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_VERIF_TEMPLATE_ID,
            {
                email,
                otp,
                name: user.name
            },
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY
            }
        );

        res.redirect("/reset_verify");

    } catch (err) {
        console.error("Forgot password error:", err);
        res.render("forgot_password", {
            error: "Something went wrong."
        });
    }
});


app.get("/reset_verify", (req, res) => {
    const data = req.session.resetData;

    if (!data) {
        return res.redirect("/forgot_password");
    }

    res.render("reset_verify", {
        error: null,
        email: data.email,
        resendAllowedAt: data.resendAllowedAt
    });
});

app.post("/reset_verify", (req, res) => {
    const { otp } = req.body;
    const data = req.session.resetData;

    if (!data) {
        return res.redirect("/forgot_password");
    }

    if (Date.now() > data.expires) {
        delete req.session.resetData;
        return res.render("reset_verify", {
            error: "OTP expired. Please request again.",
            email: data.email,
            resendAllowedAt: data.resendAllowedAt
        });
    }

    if (String(otp) !== String(data.otp)) {
        return res.render("reset_verify", {
            error: "Incorrect OTP. Please try again.",
            email: data.email,
            resendAllowedAt: data.resendAllowedAt
        });
    }

    res.redirect("/set_new_password");
});

app.get("/set_new_password", (req, res) => {
    if (!req.session.resetData) {
        return res.redirect("/forgot_password");
    }

    res.render("set_new_password", { error: null });
});

app.post("/set_new_password", async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const data = req.session.resetData;

        if (!data) {
            return res.redirect("/forgot_password");
        }

        if (password !== confirmPassword) {
            return res.render("set_new_password", {
                error: "Passwords do not match."
            });
        }

        await Profile.updateOne(
            { email: data.email },
            { $set: { pin: password } }
        );

        delete req.session.resetData;

        res.redirect("/signin");

    } catch (err) {
        console.error("Reset error:", err);
        res.render("set_new_password", {
            error: "Failed to update password."
        });
    }
});
app.post("/resend-reset-otp", async (req, res) => {
    const data = req.session.resetData;

    if (!data) return res.redirect("/forgot_password");

    if (Date.now() < data.resendAllowedAt) {
        const secondsLeft = Math.ceil(
            (data.resendAllowedAt - Date.now()) / 1000
        );

        return res.render("reset_verify", {
            error: `Please wait ${secondsLeft}s before resending OTP.`,
            email: data.email,
            resendAllowedAt: data.resendAllowedAt
        });
    }

    const newOtp = Math.floor(1000 + Math.random() * 9000);

    data.otp = newOtp;
    data.expires = Date.now() + 10 * 60 * 1000;
    data.resendAllowedAt = Date.now() + 5 * 60 * 1000

    await emailjs.send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_VERIF_TEMPLATE_ID,
        {
            email: data.email,
            otp: newOtp
        },
        {
            publicKey: process.env.EMAILJS_PUBLIC_KEY,
            privateKey: process.env.EMAILJS_PRIVATE_KEY
        }
    );

    res.render("reset_verify", {
        error: "New OTP sent.",
        email: data.email,
        resendAllowedAt: data.resendAllowedAt
    });
});
app.get("/solution/:id", async (req, res) => {
    const q = await Question.findById(req.params.id).lean();
    if (!q) return res.status(404).render("404");
    res.render("solution", { question: q });
});

/* =====================================================
   START
===================================================== */

(async () => {
    try {
        await connectDB();
        await buildIndex();
        console.log("Mongo Ready");
    } catch (err) {
        console.warn("Mongo unavailable");
    }
})();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});