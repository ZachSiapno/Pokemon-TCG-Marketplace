// for index.html

loginButton = document.getElementById("login");
signUpButton = document.getElementById("signup");

loginButton.addEventListener("click", () => {
    window.location.href = "/login.html";
});

signUpButton.addEventListener("click", () => {
    window.location.href = "/signup.html";
});