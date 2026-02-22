import { fetch } from "expo/fetch";
import { authClient } from "./auth/auth-client";

type UploadResult = {
  id: string;
  url: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
};

export async function uploadFile(
  uri: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

  const formData = new FormData();
  formData.append("file", { uri, type: mimeType, name: filename } as any);

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: {
      Cookie: authClient.getCookie(),
    },
  });

  const text = await response.text();
  let data: { data?: UploadResult; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Upload failed: server returned non-JSON response`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Upload failed (${response.status})`);
  }

  if (!data.data) {
    throw new Error("Upload failed: no data returned");
  }

  return data.data;
}
