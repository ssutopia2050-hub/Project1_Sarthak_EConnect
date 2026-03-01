document.addEventListener("DOMContentLoaded", () => {

    console.log("Signup JS loaded");

    const form = document.getElementById("signupForm");

    form.addEventListener("submit", (e) => {

        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value.trim();
        const phone = form.phone.value.trim();
        const age = form.age.value.trim();
        const role = form.role.value;

        if (!name || !email || !password || !phone || !age || !role) {
            e.preventDefault();
            alert("Please fill all fields.");
            return;
        }

        if (password.length < 4) {
            e.preventDefault();
            alert("Password must be at least 4 characters.");
            return;
        }

        // If validation passes → form submits normally to server
    });

});