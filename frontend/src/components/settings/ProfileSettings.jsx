// src/components/settings/ProfileSettings.jsx
import { updateProfile } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { useEffect, useState } from "react";
import { auth, db, storage } from "../../firebase/firebase";

export default function ProfileSettings({ userData }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(""); // now read-only
  const [photoURL, setPhotoURL] = useState(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const defaultAvatar = "https://i.imgur.com/6VBx3io.png";

  // LOAD USER DATA
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !userData) return;

    setDisplayName(user.displayName || userData.displayName || "");
    setEmail(user.email || userData.email || "");

    const authPhoto = user.photoURL;
    const firestorePhoto = userData.photoURL;
    setPhotoURL(authPhoto || firestorePhoto || null);
  }, [userData]);

  // UPLOAD FROM DEVICE
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

      await updateDoc(doc(db, "users", user.uid), { photoURL: url });

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

  // USE URL
  const handleUseUrl = async () => {
    const user = auth.currentUser;
    const url = externalUrl.trim();
    if (!user || !url) return alert("Enter a valid URL.");

    try {
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      setPhotoURL(url);
      alert("Profile picture updated via URL!");
    } catch (err) {
      console.error(err);
      alert("Failed to update picture from URL.");
    }
  };

  // REMOVE PICTURE
  const handleRemovePicture = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await deleteObject(storageRef).catch(() => {});

      await updateProfile(user, { photoURL: "" });
      await updateDoc(doc(db, "users", user.uid), { photoURL: "" });

      setPhotoURL(null);
      setExternalUrl("");
      alert("Profile picture removed!");
    } catch (err) {
      console.error(err);
      alert("Failed to remove picture.");
    }
  };

  // SAVE (Display Name ONLY)
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      await updateDoc(doc(db, "users", user.uid), {
        displayName,
      });

      alert("Profile updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    }
  };

  // DELETE ACCOUNT
  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmDelete = window.confirm(
      "Are you absolutely sure? This will permanently delete your entire account and ALL data. This cannot be undone.",
    );

    if (!confirmDelete) return;

    try {
      const uid = user.uid;

      // Delete profile picture
      const picRef = ref(storage, `profilePictures/${uid}`);
      await deleteObject(picRef).catch(() => {});

      // Delete all subcollections
      const subcollections = ["transactions", "taxCalculations", "alerts"];
      for (let sub of subcollections) {
        const colRef = collection(db, "users", uid, sub);
        const snapshot = await getDocs(colRef);
        const batch = writeBatch(db);
        snapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      // Delete user doc
      await deleteDoc(doc(db, "users", uid));

      // Delete auth user
      await user.delete();

      window.location.href = "/login";
    } catch (err) {
      console.error("Delete account error:", err);
      alert("Failed to delete account. You may need to re-login.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>

      <div className="space-y-8 rounded-xl border bg-white p-6 shadow-md">
        {/* Profile Picture */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Profile Picture</h3>

          <div className="flex items-center gap-6">
            <img
              src={photoURL || defaultAvatar}
              alt="avatar"
              className="h-28 w-28 rounded-full border object-cover shadow"
            />

            <div className="space-y-3">
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                {uploading ? "Uploading..." : "Upload Photo"}
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste image URL..."
                  className="w-60 rounded-lg border p-2 focus:ring focus:ring-blue-200"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
                <button
                  className="rounded-lg bg-gray-200 px-3 py-2 text-sm transition hover:bg-gray-300"
                  onClick={handleUseUrl}
                >
                  Use URL
                </button>
              </div>

              {photoURL && (
                <button
                  className="text-sm text-red-500 underline"
                  onClick={handleRemovePicture}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        <hr />

        {/* Display Name + Email (read-only) */}
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              className="mt-1 w-full rounded-lg border p-2 focus:ring focus:ring-blue-200"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Email (managed by Google)
            </label>
            <input
              className="mt-1 w-full cursor-not-allowed rounded-lg border bg-gray-100 p-2"
              value={email}
              readOnly
            />
            <p className="mt-1 text-xs text-gray-500">
              Email is controlled by Google Sign-In and cannot be changed.
            </p>
          </div>
        </div>

        <button
          className="rounded-lg bg-blue-600 px-5 py-2 text-white shadow transition hover:bg-blue-700"
          onClick={handleSave}
        >
          Save Changes
        </button>

        {/* DELETE ACCOUNT */}
        <hr className="my-6" />

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="mb-2 text-lg font-semibold text-red-700">
            Delete Account
          </h3>
          <p className="mb-4 text-sm text-red-600">
            This will permanently delete your account and ALL data. This cannot
            be undone.
          </p>

          <button
            onClick={handleDeleteAccount}
            className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
