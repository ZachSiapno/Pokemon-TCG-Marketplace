let profileLink = document.getElementById("profileLink");

profileLink.href = `profile.html?user=${sessionStorage.getItem("username")}`;