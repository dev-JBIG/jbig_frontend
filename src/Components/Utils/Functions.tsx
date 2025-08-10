import {signout} from "../../API/req";

export const signoutFunction = async () => {
    await signout();
    localStorage.removeItem("jbig-accessToken");
    localStorage.removeItem("jbig-username");
    localStorage.removeItem("jbig-semester");
    localStorage.removeItem("jbig-email");
    localStorage.removeItem("jbig-refresh");
};