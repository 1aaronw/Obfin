import admin from "firebase-admin";

export async function validateChatInput(uid, message) {
  const trimmedMessage = message?.trim();
  if (!trimmedMessage || trimmedMessage.length === 0) {
    return { valid: false, error: "Message is required." };
  }
  if (trimmedMessage.length > 1000) {
    return { valid: false, error: "Message too long (max 1000 characters)." };
  }

  const db = admin.firestore();
  const metadataRef = db
    .collection("users")
    .doc(uid)
    .collection("chat_metadata")
    .doc("rate_limit");

  try {
    const metadataDoc = await metadataRef.get();
    if (metadataDoc.exists()) {
      const data = metadataDoc.data();
      const now = admin.firestore.Timestamp.now().toMillis();
      const lastTime = data.lastMessageTime?.toMillis() || 0;
      if (now - lastTime < 10000) {
        // 10 sec cd
        const remaining = Math.ceil((10000 - (now - lastTime)) / 1000);
        return {
          valid: false,
          error: `Rate limited. Please wait ${remaining} second(s).`,
        };
      }
    }
  } catch (err) {
    // if it somehow fails
    console.error(`Rate limit check failed for UID ${uid}:`, err);
  }

  return { valid: true };
}

export async function updateChatRateLimit(uid) {
  const db = admin.firestore();
  const metadataRef = db
    .collection("users")
    .doc(uid)
    .collection("chat_metadata")
    .doc("rate_limit");
  try {
    await metadataRef.set(
      {
        lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error(`Failed to update rate limit for UID ${uid}:`, err);
  }
}

export function estimateInputTokens(text) {
  // rough approximation: ~4 characters per token (english text only)
  // apparently google offers a similar approximation in their docs
  return Math.ceil((text || "").length / 4);
}
