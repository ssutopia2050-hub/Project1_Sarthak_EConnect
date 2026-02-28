document.addEventListener("DOMContentLoaded", () => {
    /* ===============================
       ELEMENT SELECTORS
    =============================== */
    const themeLink = document.getElementById("themeStylesheet");
    const theme_toggle = document.querySelector(".dark-mode-toggle");
    const profileIcon = document.querySelector(".link-container-profile-icon");
    const dropdown = document.querySelector(".drop-down-profile");
    const input = document.getElementById("promptInput");
    const searchBtn = document.querySelector(".search-icon");
    const resultsSection = document.querySelector(".results-section");
    const home_btn = document.querySelector(".logo-text");
    if(localStorage.getItem("theme_app_SolveR") === "light"){
        themeLink.href = "/style_home_bright_mode.css";
        theme_toggle.innerText = "Dark Mode";
    }
    else{
        themeLink.href = "/style_home_dark_mode.css";
        theme_toggle.innerText = "Light Mode";
    }
    theme_toggle.addEventListener("click", () => {
        if (themeLink.href.includes("dark")) {
            themeLink.href = "/style_home_bright_mode.css";
            theme_toggle.innerText = "Dark Mode";
            localStorage.setItem("theme_app_SolveR", "light");

        } else {
            themeLink.href = "/style_home_dark_mode.css";
            theme_toggle.innerText = "Light Mode";
            localStorage.setItem("theme_app_SolveR", "dark");
        }
    });
    home_btn.addEventListener("click", async (e) => {
      window.location.href = "/";
    })
    /* ===============================
       PROFILE DROPDOWN
    =============================== */
    if (profileIcon && dropdown) {
        profileIcon.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.style.display =
                dropdown.style.display === "flex" ? "none" : "flex";
        });

        document.addEventListener("click", () => {
            dropdown.style.display = "none";
        });
    }

    /* ===============================
       SCROLL ANIMATION OBSERVER
    =============================== */
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15 }
    );

    /* ===============================
       FETCH + RENDER RESULTS
    =============================== */
    async function fetchResults(prompt) {
        // Show loader
        resultsSection.innerHTML = `
        <div class="results-loader" id="resultsLoader">
            <div class="spinner"></div>
            <p>Searching SolveR...</p>
        </div>
    `;

        try {
            const res = await fetch("/process-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt })
            });

            const data = await res.json();
            // console.log(data.results);
            // console.log(prompt);
            // 🔥 REMOVE LOADER HERE
            const loader = document.getElementById("resultsLoader");
            if (loader) loader.remove();
            await renderAiResult(prompt);

            // if (!data.results || data.results.length === 0) {
            //     resultsSection.innerHTML = "<p>No results found.</p>";
            //     return;
            // }

            data.results.slice(0, 10).forEach(renderResult);

        } catch (err) {
            console.error("Request failed", err);

            // 🔥 ALSO REMOVE LOADER ON ERROR
            const loader = document.getElementById("resultsLoader");
            if (loader) loader.remove();

            resultsSection.innerHTML = "<p>Something went wrong. Try again.</p>";
        }
    }
    /* ===============================
       RENDER AI SINGLE RESULT
    =============================== */
    async function renderAiResult(prompt) {

        /* MAIN AI BOX */
        const aiBox = document.createElement("div");
        aiBox.className = "ai-result-tab";

        /* TOP BAR */
        const topBar = document.createElement("div");
        topBar.className = "ai-result-tab-top";

        const geminiLogoWrap = document.createElement("div");
        geminiLogoWrap.className = "gemini-logo";

        const geminiLogo = document.createElement("img");
        geminiLogo.src = "/gemini-color.svg";

        geminiLogoWrap.appendChild(geminiLogo);

        const title = document.createElement("div");
        title.className = "gemini-title";
        title.innerText = "GPT-Solution";

        const tag = document.createElement("div");
        tag.className = "premium-tag-display";
        tag.innerText = "Free tier";

        topBar.append(geminiLogoWrap, title, tag);

        /* BODY */
        const body = document.createElement("div");
        body.className = "ai-result-body";

        /* 🔥 LOADER INSERTED FIRST */
        body.innerHTML = `
        <div class="ai-loader">
            <div class="ai-loader-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span>Thinking…</span>
        </div>
    `;

        aiBox.append(topBar, body);
        resultsSection.prepend(aiBox);

        observer.observe(aiBox);

        /* FETCH AI ANSWER */
        try {
            const res = await fetch("/ai-answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: prompt })
            });

            const data = await res.json();

            /* 🔥 REPLACE LOADER WITH ANSWER */
            // console.log(data.answer);
            body.innerHTML = marked.parse(data.answer);


        } catch (err) {
            body.innerHTML = "<p>⚠️ Failed to fetch AI answer.</p>";
            console.error(err);
        }
    }
    /* ===============================
       RENDER SINGLE RESULT
    =============================== */
    function renderResult(item) {

        const resultBox = document.createElement("div");
        resultBox.className = "result-tab";

        /* Question */
        const questionDiv = document.createElement("div");
        questionDiv.className = "result-tab-question-display";
        questionDiv.innerText = item.question;
        resultBox.appendChild(questionDiv);

        /* Tags container */
        const tagBox = document.createElement("div");
        tagBox.className = "small-tags-for-result-tab";

        /* Difficulty */
        const difficulty = document.createElement("div");
        difficulty.className = "result-tab-difficulty-display";
        difficulty.innerText = item.difficulty;

        if (item.difficulty === "Easy") difficulty.classList.add("easy");
        if (item.difficulty === "Moderate") difficulty.classList.add("moderate");
        if (item.difficulty === "Hard") difficulty.classList.add("difficult");

        tagBox.appendChild(difficulty);

        /* Competition */
        const competition = document.createElement("div");
        competition.className = "result-tab-competitions-asked";
        competition.innerText = item.competition;
        tagBox.appendChild(competition);

        /* Subject */
        const subject = document.createElement("div");
        subject.className = "result-tab-subject-display";
        subject.innerText = item.subject;
        tagBox.appendChild(subject);

        /* Class (optional safety) */
        if (item.class) {
            const classTag = document.createElement("div");
            classTag.className = "result-tab-class-display";
            classTag.innerText = item.class;
            tagBox.appendChild(classTag);
        }

        resultBox.appendChild(tagBox);

        /* Topic */
        if (item.topic) {
            const topic = document.createElement("div");
            topic.className = "result-tab-topic-of-question-display";
            topic.innerText = `Topic: ${item.topic}`;
            resultBox.appendChild(topic);
        }

        /* Solution Button */
        const solutionBtn = document.createElement("a");
        solutionBtn.classList.add("result-tab-solution-view-button");
        solutionBtn.innerText = "Solution";
        solutionBtn.href = `/solution/${item._id}`;
        solutionBtn.target = "_blank";
        resultBox.appendChild(solutionBtn);

        /* Add + animate */
        resultsSection.appendChild(resultBox);
        observer.observe(resultBox);

        /* 🔥 Trigger animation immediately if already visible */
        const rect = resultBox.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
            resultBox.classList.add("show");
            observer.unobserve(resultBox);
        }
    }

    /* ===============================
       EVENTS
    =============================== */

    searchBtn.addEventListener("click", () => {
        if (input.value.trim()) {
            fetchResults(input.value.trim());
            input.value = "";
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value.trim()) {
            fetchResults(input.value.trim());
            input.value = "";
        }
    });

});