export const MAX_DIRECT_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function uploadFileDirectToS3({ file, folder, namePrefix }) {
  if (!(file instanceof File)) {
    return null;
  }
  if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than 15 MB.`);
  }

  const presignResponse = await fetch("/api/s3-presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      folder,
      namePrefix,
    }),
  });
  const presignPayload = await presignResponse.json();
  if (!presignResponse.ok) {
    throw new Error(presignPayload.error || "Failed to prepare upload.");
  }

  const upload = presignPayload.upload;
  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": upload.contentType || file.type || "application/octet-stream" },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload ${file.name} to storage.`);
  }

  return upload;
}
