// for signup.html 

let signUpButton = document.getElementById("signup");
let errorMessage = document.getElementById("error");

let username = document.getElementById("username");
let email = document.getElementById("email");
let password = document.getElementById("password");
let confirmPassword = document.getElementById("confirmPassword");

signUpButton.addEventListener("click", () => {
    fetch("/signup", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: username.value,
            email: email.value,
            password: password.value,
            confirmPassword: confirmPassword.value
    }),
    }).then((response) => {
        errorMessage.style.color = "black";

        if (!response.ok) {
            errorMessage.style.color = "red";

            return response.text().then((text) => {
                errorMessage.textContent = text;
            });
        }

        window.location.href = "/";
    }).catch((error) => {
        errorMessage .textContent = "Bad request";
        console.log(error);
    });
})