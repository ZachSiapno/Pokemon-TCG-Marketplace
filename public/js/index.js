// GET PROFILE

let profileLink = document.getElementById("profileLink");

profileLink.href = `profile.html?user=${sessionStorage.getItem("username")}`;

// GET FORM POSTS INTO DATABASE

let postForm = document.getElementById("postForm");
let content = document.getElementById("content");

postForm.addEventListener("submit", async(e) => {
    e.preventDefault();

    const response = await fetch("/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: Number(sessionStorage.getItem("userId")),
            content: content.value
        })
    });

    console.log(response.status);
});

// ADD POSTS FROM DATABASE TO MAIN PAGE

let postsDiv = document.getElementById("posts");

fetch("/posts").then(response => response.json())
.then(posts => {

    posts.forEach(post => {

        let postDiv = document.createElement("div");

        postDiv.innerHTML = `
            <h3>${post.username}</h3>
            <p>${post.content}</p>
        `;

        postsDiv.append(postDiv);
    });

});