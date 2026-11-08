const userId = sessionStorage.getItem("userId"); // NOTE: USE TO CHECK IF YOUR PROFILE OR OTHER PROFILE LATER
const username = sessionStorage.getItem("username");

const name = document.getElementById("name");
const followers = document.getElementById("followers");
const following = document.getElementById("following");
const errorMessage = document.getElementById("error");

const followUnfollowerButton = document.getElementById("followUnfollow");

// GET USER DETAILS
fetch(`/profile/${username}`)
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

})
.catch((error) => {
    console.log(error);
    errorMessage.textContent = "Failed to load profile";
});



// FOLLOW/UNFOLLOW BUTTON