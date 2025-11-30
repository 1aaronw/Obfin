// src/components/settings/ProfileSettings.jsx
import { updateEmail, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import { auth, db, storage } from "../../firebase/firebase";

export default function ProfileSettings({ userData }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const defaultAvatar = "https://i.imgur.com/6VBx3io.png";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !userData) return;

    setDisplayName(user.displayName || userData.displayName || "");
    setEmail(user.email || userData.email || "");

    const authPhoto = user.photoURL;
    const firestorePhoto = userData.photoURL;
    setPhotoURL(authPhoto || firestorePhoto || null);
  }, [userData]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    const user = auth.currentUser;
    if (!file || !user) return;

    try {
      setUploading(true);

      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: url });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: url });

      setPhotoURL(url);
      setExternalUrl("");
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload picture.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUseUrl = async () => {
    const user = auth.currentUser;
    const url = externalUrl.trim();

    if (!user || !url) {
      alert("Please enter a valid URL.");
      return;
    }

    try {
      await updateProfile(user, { photoURL: url });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: url });

      setPhotoURL(url);
      alert("Profile picture updated from URL!");
    } catch (err) {
      console.error("URL photo error:", err);
      alert("Failed to set picture from URL.");
    }
  };

  const handleRemovePicture = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await deleteObject(storageRef).catch(() => {});

      await updateProfile(user, { photoURL: "" });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: "" });

      setPhotoURL(null);
      setExternalUrl("");
      alert("Profile picture removed!");
    } catch (err) {
      console.error("Remove error:", err);
      alert("Failed to remove picture.");
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      if (email !== user.email) {
        await updateEmail(user, email);
      }

      // Removed: state update
      await updateDoc(userRef, {
        displayName,
        email,
      });

      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save profile changes.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>

      <div className="bg-white rounded-xl shadow-md border p-6 space-y-8">

        {/* Profile Picture Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Profile Picture</h3>

          <div className="flex items-center gap-6">
            <img
              src={photoURL || defaultAvatar}
              alt="avatar"
              className="w-28 h-28 rounded-full object-cover border shadow"
            />

            <div className="space-y-3">
              <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                {uploading ? "Uploading..." : "Upload Photo"}
              </label>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Paste image URL..."
                  className="border rounded-lg p-2 w-60 focus:ring focus:ring-blue-200"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
                <button
                  className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition text-sm"
                  onClick={handleUseUrl}
                >
                  Use URL
                </button>
              </div>

              {photoURL && (
                <button
                  className="text-red-500 underline text-sm"
                  onClick={handleRemovePicture}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        <hr />

        {/* Info Section */}
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">Display Name</label>
            <input
              className="border p-2 w-full rounded-lg focus:ring focus:ring-blue-200 mt-1"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              className="border p-2 w-full rounded-lg focus:ring focus:ring-blue-200 mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <button
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}