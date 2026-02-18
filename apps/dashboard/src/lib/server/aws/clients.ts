import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@segmentation/env/server";

export const dynamoClient = new DynamoDBClient({
  region: env.AWS_REGION,
});

export const s3Client = new S3Client({
  region: env.AWS_REGION,
});
