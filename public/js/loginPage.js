// for signup.html 

let loginButton = document.getElementById("login");
let errorMessage = document.getElementById("error");

let username = document.getElementById("username");
let password = document.getElementById("password");


loginButton.addEventListener("click", () => {
    fetch("/login", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: username.value,
            password: password.value,
    }),
    }).then(async (response) => {
        errorMessage.style.color = "black";

        if (!response.ok) {
            errorMessage.style.color = "red";

            return response.text().then((text) => {
                errorMessage.textContent = text;
            });
        }

        const data = await response.json();

        sessionStorage.setItem("userId", data.id);
        sessionStorage.setItem("username", data.username);

        window.location.href = "/";
    }).catch((error) => {
        errorMessage .textContent = "Bad request";
        console.log(error);
    });
})