import * as FileSystem from "expo-file-system";
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

  // FileSystem.uploadAsync handles local file:// URIs correctly for both images
  // and large video files on iOS/Android — much more reliable than fetch + FormData
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
    throw new Error(`Upload failed: server returned unexpected response (status ${response.status})`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(data.error || `Upload failed (${response.status})`);
  }

  if (!data.data) {
    throw new Error("Upload failed: no data returned from server");
  }

  return data.data;
}
