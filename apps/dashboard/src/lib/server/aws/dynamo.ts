import { GetItemCommand, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { env } from "@segmentation/env/server";

import { dynamoClient } from "./clients";

function getApiKeysTableName() {
  if (!env.AWS_DYNAMO_API_KEYS_TABLE) {
    throw new Error("AWS_DYNAMO_API_KEYS_TABLE is not configured");
  }

  return env.AWS_DYNAMO_API_KEYS_TABLE;
}

function getBalancesTableName() {
  if (!env.AWS_DYNAMO_BALANCE_TABLE) {
    throw new Error("AWS_DYNAMO_BALANCE_TABLE is not configured");
  }

  return env.AWS_DYNAMO_BALANCE_TABLE;
}

export async function getDynamoTokenBalance(accountId: string) {
  const command = new GetItemCommand({
    TableName: getBalancesTableName(),
    Key: marshall({ accountId }),
  });

  const response = await dynamoClient.send(command);

  if (!response.Item) {
    return 0;
  }

  const parsed = unmarshall(response.Item) as {
    accountId: string;
    tokensRemaining?: number;
  };

  return Number(parsed.tokensRemaining ?? 0);
}

export async function incrementDynamoTokenBalance(accountId: string, tokensToAdd: number) {
  const command = new UpdateItemCommand({
    TableName: getBalancesTableName(),
    Key: marshall({ accountId }),
    UpdateExpression: "ADD tokensRemaining :tokens",
    ExpressionAttributeValues: marshall({
      ":tokens": tokensToAdd,
    }),
    ReturnValues: "UPDATED_NEW",
  });

  const response = await dynamoClient.send(command);

  if (!response.Attributes) {
    return null;
  }

  const parsed = unmarshall(response.Attributes) as {
    tokensRemaining?: number;
  };

  return Number(parsed.tokensRemaining ?? 0);
}

export async function putDynamoApiKey(params: {
  accountId: string;
  keyHash: string;
  keyId: string;
  keyPrefix: string;
  revoked: boolean;
}) {
  await dynamoClient.send(
    new PutItemCommand({
      TableName: getApiKeysTableName(),
      Item: marshall({
        accountId: params.accountId,
        keyHash: params.keyHash,
        keyId: params.keyId,
        keyPrefix: params.keyPrefix,
        revoked: params.revoked,
      }),
    }),
  );
}

export async function setDynamoApiKeyRevoked(params: { keyId: string; revoked: boolean }) {
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: getApiKeysTableName(),
      Key: marshall({
        keyId: params.keyId,
      }),
      UpdateExpression: "SET revoked = :revoked",
      ExpressionAttributeValues: marshall({
        ":revoked": params.revoked,
      }),
    }),
  );
}
