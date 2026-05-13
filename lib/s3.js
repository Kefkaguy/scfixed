import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let s3Client;

function getS3Config() {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS S3 environment variables.");
  }

  return { bucket, region, accessKeyId, secretAccessKey };
}

function getS3Client() {
  if (!s3Client) {
    const { region, accessKeyId, secretAccessKey } = getS3Config();
    s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

function sanitizeSegment(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildS3Url(key) {
  const { bucket, region } = getS3Config();
  const customBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (customBaseUrl) {
    return `${customBaseUrl.replace(/\/$/, "")}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function getS3KeyFromUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const { bucket } = getS3Config();
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.replace(/^\/+/, "");
    const hostname = parsedUrl.hostname;

    if (hostname === `${bucket}.s3.amazonaws.com`) {
      return pathname || null;
    }

    if (hostname === `${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`) {
      return pathname || null;
    }

    const customBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
    if (customBaseUrl) {
      const parsedBaseUrl = new URL(customBaseUrl);
      if (parsedBaseUrl.origin === parsedUrl.origin) {
        const basePath = parsedBaseUrl.pathname.replace(/^\/+|\/+$/g, "");
        if (!basePath) {
          return pathname || null;
        }
        if (pathname.startsWith(`${basePath}/`)) {
          return pathname.slice(basePath.length + 1) || null;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function deleteFileFromS3(key) {
  if (!key) {
    return;
  }

  const { bucket } = getS3Config();
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export async function uploadFileToS3({ file, folder, namePrefix }) {
  const { bucket } = getS3Config();
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const safeFolder = sanitizeSegment(folder) || "uploads";
  const safeNamePrefix = sanitizeSegment(namePrefix) || "file";
  const key = `${safeFolder}/${safeNamePrefix}-${crypto.randomUUID()}.${extension}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: file.type || "application/octet-stream",
    })
  );

  return {
    key,
    url: buildS3Url(key),
    contentType: file.type || "application/octet-stream",
    originalName: file.name,
  };
}
