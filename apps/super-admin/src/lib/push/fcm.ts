import "server-only";
import { GoogleAuth } from "google-auth-library";

let cachedAuth: GoogleAuth | null = null;
let cachedProjectId: string | null = null;

function getAuth(): { auth: GoogleAuth; projectId: string } {
  if (!cachedAuth || !cachedProjectId) {
    const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FCM_SERVICE_ACCOUNT_JSON is not set");
    const credentials = JSON.parse(raw);
    cachedAuth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    cachedProjectId = credentials.project_id;
  }
  return { auth: cachedAuth, projectId: cachedProjectId! };
}

// Best-effort, never throws -- caller (dispatch.ts) is the single place that decides
// whether a failure should remove a dead token; this function just reports success.
export async function sendAndroidPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ ok: true } | { ok: false; deadToken: boolean }> {
  try {
    const { auth, projectId } = getAuth();
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: { priority: "high" },
          },
        }),
      }
    );

    if (res.ok) return { ok: true };

    // 404 (UNREGISTERED) / 400 (INVALID_ARGUMENT, e.g. malformed/expired token) mean
    // the token is dead and should be removed so it stops getting retried forever.
    const deadToken = res.status === 404 || res.status === 400;
    return { ok: false, deadToken };
  } catch {
    return { ok: false, deadToken: false };
  }
}
