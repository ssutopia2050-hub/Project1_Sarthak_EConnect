document.addEventListener("DOMContentLoaded", async () => {
    const themeLink = document.getElementById("themeStylesheet");
    const theme_toggle = document.querySelector(".dark-mode-toggle");
    const profileIcon = document.querySelector(".link-container-profile-icon");
    const dropdown = document.querySelector(".drop-down-profile");
    const home_btn = document.querySelector(".logo-text");
    const pricing_page_btn = document.querySelector(".Pricing");
    const logout = document.querySelector(".LogOut");
    /* ===============================
     Logout
   =============================== */
    logout.addEventListener("click", (e) => {
        window.location.href = "/logout";
    })
    pricing_page_btn.addEventListener("click", async () => {
        window.location.href="/pricing";
    })
    home_btn.addEventListener("click", async (e) => {
        window.location.href = "/home";
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

})