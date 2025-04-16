export default function getCurrentUser(){
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};