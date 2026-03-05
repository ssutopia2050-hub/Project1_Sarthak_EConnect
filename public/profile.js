// ================= PROFILE IMAGE =================

const profileImage = document.getElementById("profileImage");
const imageInput = document.getElementById("imageInput");
const ring = document.getElementById("progressRing");
const circle = document.getElementById("progressCircle");
const home_nav = document.querySelector(".logo-and-text-container");
home_nav.addEventListener("click", (e) => {
    window.location.href = "/home";
})
const circumference = 2 * Math.PI * 102;

circle.style.strokeDasharray = circumference;
circle.style.strokeDashoffset = circumference;

function setProgress(percent){
    const offset = circumference - percent/100 * circumference;
    circle.style.strokeDashoffset = offset;
}

profileImage.addEventListener("click", () => {
    imageInput.click();
});

imageInput.addEventListener("change", async () => {

    const file = imageInput.files[0];
    if(!file) return;

    ring.style.display = "block";
    setProgress(10);

    const formData = new FormData();
    formData.append("profile_picture", file);

    const res = await fetch("/profile/update-photo", {
        method: "POST",
        body: formData
    });

    setProgress(70);

    const data = await res.json();

    if(data.success){

        const img = new Image();
        img.src = data.imagePath + "?" + new Date().getTime();

        img.onload = () => {

            setProgress(100);

            setTimeout(()=>{
                profileImage.src = img.src;
                ring.style.display = "none";
                setProgress(0);
            },300);

        };

    } else {
        ring.style.display="none";
    }

});

// ================= NAME EDIT =================

const displayName = document.getElementById("displayName");
const nameInput = document.getElementById("nameInput");

displayName.addEventListener("click", () => {
    displayName.style.display = "none";
    nameInput.style.display = "block";
    nameInput.focus();
});

async function saveName() {
    const newName = nameInput.value.trim();
    if (!newName) return;

    await fetch("/profile/update-name", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newName })
    });

    displayName.textContent = newName;
    nameInput.style.display = "none";
    displayName.style.display = "block";
}

nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        saveName();
    }
});

nameInput.addEventListener("blur", () => {
    saveName();
});