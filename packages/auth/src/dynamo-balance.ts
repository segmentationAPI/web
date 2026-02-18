import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { env } from "@segmentation/env/server";

const dynamoClient = new DynamoDBClient({
  region: env.AWS_REGION,
});

function getBalanceTableName() {
  if (!env.AWS_DYNAMO_BALANCE_TABLE) {
    throw new Error("AWS_DYNAMO_BALANCE_TABLE is not configured");
  }

  return env.AWS_DYNAMO_BALANCE_TABLE;
}

export async function initializeDynamoTokenBalance(userId: string) {
  try {
    await dynamoClient.send(
      new PutItemCommand({
        ConditionExpression: "attribute_not_exists(accountId)",
        Item: marshall({
          accountId: userId,
          tokensRemaining: 0,
        }),
        TableName: getBalanceTableName(),
      }),
    );
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
      return;
    }

    throw error;
  }
}
