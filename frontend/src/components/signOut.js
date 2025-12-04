import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase"; // adjust as needed

const handleSignOut = async () => {
  const confirmed = window.confirm("Are you sure you want to sign out?");
  if (!confirmed) return;

  try {
    await signOut(auth);
    console.log("User signed out");
    window.location.href = "/login";
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export default handleSignOut;
