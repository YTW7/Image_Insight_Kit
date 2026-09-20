import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL, // set for LocalStack, omit for real AWS
  forcePathStyle: !!process.env.AWS_ENDPOINT_URL, // required for LocalStack
});

const BUCKET = process.env.S3_BUCKET ?? "image-insight-uploads";

export async function logAnalyzedImage(
  buffer: Buffer,
  filename: string,
  predictions: { className: string; probability: number }[]
) {
  const key = `${Date.now()}-${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/octet-stream",
      Metadata: {
        predictions: JSON.stringify(predictions).slice(0, 2000), // S3 metadata size limit
      },
    })
  );

  return key;
}