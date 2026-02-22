import * as FileSystem from "expo-file-system";

type UploadResult = {
  id: string;
  url: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
};

// Upload directly to Vibecode storage — bypasses the backend proxy
// which has a request body size limit that rejects large video files.
const STORAGE_URL = "https://storage.vibecodeapp.com/v1/files/upload";

export async function uploadFile(
  uri: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const response = await FileSystem.uploadAsync(STORAGE_URL, uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    parameters: {},
    headers: {},
  });

  let data: { file?: UploadResult; error?: string };
  try {
    data = JSON.parse(response.body) as { file?: UploadResult; error?: string };
  } catch {
    throw new Error(`Upload failed: unexpected response (status ${response.status})`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(data.error || `Upload failed (${response.status})`);
  }

  if (!data.file) {
    throw new Error("Upload failed: no file data returned");
  }

  return data.file;
}
