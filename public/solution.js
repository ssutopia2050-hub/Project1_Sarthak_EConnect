document.addEventListener("DOMContentLoaded", (e) => {
    const profileIcon = document.querySelector(".link-container-profile-icon");
    const dropdown = document.querySelector(".drop-down-profile");
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