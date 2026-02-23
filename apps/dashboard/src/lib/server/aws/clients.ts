import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { env } from "@segmentation/env/dashboard";

export const dynamoClient = new DynamoDBClient({
  region: env.AWS_REGION,
});
