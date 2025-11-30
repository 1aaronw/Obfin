import { useCallback, useEffect, useState } from "react";
import FinanceSettings from "../components/settings/FinanceSettings";
import ProfileSettings from "../components/settings/ProfileSettings";

import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  // Fetch User Data
  const loadUser = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setUserData(snap.data());
      }
    } catch (err) {
      console.error("Failed to load user settings:", err);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading || !userData)
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <p>Loading settings…</p>
      </div>
    );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-6 border-b pb-2 mb-6 text-lg">
        <button
          className={activeTab === "profile" ? "font-bold text-blue-600" : ""}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>

        <button
          className={activeTab === "finance" ? "font-bold text-blue-600" : ""}
          onClick={() => setActiveTab("finance")}
        >
          Finance
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "profile" && (
        <ProfileSettings userData={userData} reload={loadUser} />
      )}

      {activeTab === "finance" && (
        <FinanceSettings userData={userData} reload={loadUser} />
      )}
    </div>
  );
}