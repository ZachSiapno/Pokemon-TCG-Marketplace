// GET PROFILE

let profileLink = document.getElementById("profileLink");

profileLink.href = `profile.html?user=${sessionStorage.getItem("username")}`;

// GET FORM POSTS INTO DATABASE

let postForm = document.getElementById("postForm");
let content = document.getElementById("content");

let postType = document.getElementById("postType");
let tradeOffer = document.getElementById("tradeOffer");
let tradeWant = document.getElementById("tradeWant");
let tradeFields = document.getElementById("tradeFields");

postType.addEventListener("change", () => {
    if (postType.value === "trade") {
        tradeFields.style.display = "block";
    }
    else {
        tradeFields.style.display = "none";
    }
});

postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    let endpoint = "/posts";
    let body;

    if (postType.value === "trade") {
        endpoint = "/trade-posts";

        body = {
            userId: Number(sessionStorage.getItem("userId")),
            content: content.value,
            tradeOffer: tradeOffer.value,
            tradeWant: tradeWant.value
        };
    }
    else {
        body = {
            user_id: Number(sessionStorage.getItem("userId")),
            content: content.value
        };
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    console.log(response.status);
});

// ADD POSTS FROM DATABASE TO MAIN PAGE

let postsDiv = document.getElementById("posts");

fetch("/posts").then(response => response.json())
.then(posts => {

    posts.forEach(post => {

        let postDiv = document.createElement("div");

        if (post.post_type === "trade") {

            postDiv.innerHTML = `
                <h3>${post.username}</h3>

                <p>${post.content}</p>

                <strong>Offering:</strong>
                <p>${post.trade_offer}</p>

                <strong>Looking For:</strong>
                <p>${post.trade_want}</p>
            `;

        }
        else {

            postDiv.innerHTML = `
                <h3>${post.username}</h3>
                <p>${post.content}</p>
            `;

        }

        postsDiv.append(postDiv);
    });

});