document.addEventListener("DOMContentLoaded", (e) => {
    const themeLink = document.getElementById("themeStylesheet");
    const theme_toggle = document.querySelector(".dark-mode-toggle");
    const profileIcon = document.querySelector(".link-container-profile-icon");
    const dropdown = document.querySelector(".drop-down-profile");
    const profileSection = document.querySelector(".profile");
    const logout = document.querySelector(".LogOut");
    /* ===============================
     Logout
   =============================== */
    logout.addEventListener("click", (e) => {
        window.location.href = "/logout";
    })
    /* ===============================
     PROFILE DROPDOWN
    =============================== */
    profileSection.addEventListener("click", (e) => {
        window.location.href = "/profile";
    })
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
    if(localStorage.getItem("theme_app_SolveR") === "light"){
        themeLink.href = "/solution_bright.css";
        theme_toggle.innerText = "Dark Mode";
    }
    else{
        themeLink.href = "/solution_dark.css";
        theme_toggle.innerText = "Light Mode";
    }
    theme_toggle.addEventListener("click", () => {
        if (themeLink.href.includes("dark")) {
            themeLink.href = "/solution_bright.css";
            theme_toggle.innerText = "Dark Mode";
            localStorage.setItem("theme_app_SolveR", "light");

        } else {
            themeLink.href = "/solution_dark.css";
            theme_toggle.innerText = "Light Mode";
            localStorage.setItem("theme_app_SolveR", "dark");
        }
    });
})