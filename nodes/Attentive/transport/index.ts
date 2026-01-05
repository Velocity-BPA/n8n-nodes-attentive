/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IWebhookFunctions,
  IHttpRequestMethods,
  IRequestOptions,
  IDataObject,
  NodeApiError,
  NodeOperationError,
  JsonObject,
} from 'n8n-workflow';

const BASE_URL = 'https://api.attentivemobile.com/v1';

export async function attentiveApiRequest(
  this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  query: IDataObject = {},
): Promise<IDataObject> {
  const credentials = await this.getCredentials('attentiveApi');

  if (!credentials?.apiKey) {
    throw new NodeOperationError(this.getNode(), 'No API key provided');
  }

  const options: IRequestOptions = {
    method,
    uri: `${BASE_URL}${endpoint}`,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    qs: query,
    json: true,
  };

  if (Object.keys(body).length > 0 && method !== 'GET') {
    options.body = body;
  }

  try {
    const response = await this.helpers.request(options);
    return response as IDataObject;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
  }
}

export async function attentiveApiRequestAllItems(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  query: IDataObject = {},
  dataKey = 'data',
): Promise<IDataObject[]> {
  const returnData: IDataObject[] = [];
  let responseData: IDataObject;
  const limit = 100;
  let offset = 0;
  const maxIterations = 1000; // Safety limit

  query.limit = limit;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    query.offset = offset;
    responseData = await attentiveApiRequest.call(this, method, endpoint, body, query);

    const items = responseData[dataKey] as IDataObject[] | undefined;
    if (items && Array.isArray(items)) {
      returnData.push(...items);
    }

    const meta = responseData.meta as IDataObject | undefined;
    const total = meta?.total as number | undefined;

    if (!total || returnData.length >= total) {
      break;
    }

    offset += limit;
  }

  return returnData;
}

export function handleApiError(error: Error, node: IExecuteFunctions): never {
  const errorData = error as unknown as IDataObject;
  const statusCode = errorData.statusCode as number | undefined;
  const message = errorData.message as string | undefined;

  let errorMessage = message || 'Unknown error occurred';

  switch (statusCode) {
    case 400:
      errorMessage = `Bad Request: ${errorMessage}`;
      break;
    case 401:
      errorMessage = 'Unauthorized: Invalid API key';
      break;
    case 403:
      errorMessage = 'Forbidden: Insufficient permissions';
      break;
    case 404:
      errorMessage = 'Not Found: Resource does not exist';
      break;
    case 429:
      errorMessage = 'Rate Limited: Too many requests. Please try again later.';
      break;
    case 500:
      errorMessage = 'Server Error: Attentive API is experiencing issues';
      break;
  }

  throw new NodeOperationError(node.getNode(), errorMessage);
}
