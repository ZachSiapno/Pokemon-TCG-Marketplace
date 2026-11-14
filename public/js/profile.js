const userId = Number(sessionStorage.getItem("userId")); // NOTE: USE TO CHECK IF YOUR PROFILE OR OTHER PROFILE LATER
const username =
    new URLSearchParams(window.location.search).get("user");

const name = document.getElementById("name");
const followers = document.getElementById("followers");
const following = document.getElementById("following");
const errorMessage = document.getElementById("error");

const followUnfollowButton = document.getElementById("followUnfollow");

// GET USER DETAILS
fetch(`/profile/${username}?viewerId=${userId}`)
.then(async (response) => {

    errorMessage.style.color = "black";

    if (!response.ok) {
        errorMessage.style.color = "red";

        return response.text().then((text) => {
            errorMessage.textContent = text;
        });
    }

    const data = await response.json();

    name.textContent = data.username;
    followers.textContent =
        `${data.followerCount} Followers`;
    following.textContent =
        `${data.followingCount} Following`;

    // FOLLOW/UNFOLLOW BUTTON
    if (data.id !== userId) {
        const followButton = document.createElement("button");
        followButton.textContent = data.isFollowing ? "Unfollow" : "Follow";

        followUnfollowButton.append(followButton);

        followButton.addEventListener("click", async () => {
            const route = data.isFollowing ? "/unfollow" : "/follow";

            const response = await fetch(route, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    follower_id: userId,
                    following_id: data.id
                })
            });

            if (response.ok) {
                data.isFollowing = !data.isFollowing;

                followButton.textContent = data.isFollowing ? "Unfollow" : "Follow";
            }
        });
    }
})
.catch((error) => {
    console.log(error);
    errorMessage.textContent = "Failed to load profile";
});


// TABS

const displayTab = document.getElementById("displayTab");
const collectionTab = document.getElementById("collectionTab");
const tradesTab = document.getElementById("tradesTab");

const display = document.getElementById("display");
const collection = document.getElementById("collection");
const trades = document.getElementById("trades");

function showTab(selectedTab) {
    display.style.display = "none";
    collection.style.display = "none";
    trades.style.display = "none";

    selectedTab.style.display = "block";
}

displayTab.addEventListener("click", () => {
    showTab(display);
});

collectionTab.addEventListener("click", () => {
    showTab(collection);
});

tradesTab.addEventListener("click", () => {
    showTab(trades);
});