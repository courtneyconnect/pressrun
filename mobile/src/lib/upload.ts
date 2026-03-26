import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
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

  if (Platform.OS === "web") {
    // On web, URIs are blob: or data: URLs — convert to Blob and use fetch + FormData.
    const blobResp = await fetch(uri);
    const blob = await blobResp.blob();
    const formData = new FormData();
    formData.append("file", blob, filename);
    const fetchResp = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: formData,
      headers: { Cookie: authClient.getCookie() },
    });
    const data = await fetchResp.json() as { data?: UploadResult; error?: string };
    if (!fetchResp.ok) throw new Error(data.error || `Upload failed (${fetchResp.status})`);
    if (!data.data) throw new Error("Upload failed: no data returned from server");
    return data.data;
  }

  // Use FileSystem.uploadAsync — handles large video file:// URIs correctly on iOS/Android.
  // Goes through the backend which proxies to storage (maxRequestBodySize raised to 500 MB).
  const response = await FileSystem.uploadAsync(
    `${BACKEND_URL}/api/upload`,
    uri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType,
      parameters: {},
      headers: {
        Cookie: authClient.getCookie(),
      },
    }
  );

  let data: { data?: UploadResult; error?: string };
  try {
    data = JSON.parse(response.body) as { data?: UploadResult; error?: string };
  } catch {
    throw new Error(`Upload failed: unexpected response (status ${response.status})`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(data.error || `Upload failed (${response.status})`);
  }

  if (!data.data) {
    throw new Error("Upload failed: no data returned from server");
  }

  return data.data;
}
