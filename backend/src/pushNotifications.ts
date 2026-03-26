const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken")) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify({ to: pushToken, title, body, data: data ?? {} }),
    });
  } catch {
    // Silent fail — push notifications are best-effort
  }
}
