const { response } = require("express");

const userId = sessionStorage.getItem("userId");
const username = sessionStorage.getItem("username");

fetch((`/profile/${userId}`), () => {

}).then((response) => {

}).catch((error) => {
    console.log(error);
}); 