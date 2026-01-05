/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { attentiveApiRequest, attentiveApiRequestAllItems } from '../../transport';
import { WEBHOOK_EVENTS } from '../../types/AttentiveTypes';
import { buildReturnData } from '../../utils';

export const webhookOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['webhook'],
      },
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a webhook',
        action: 'Create webhook',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete a webhook',
        action: 'Delete webhook',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all webhooks',
        action: 'Get all webhooks',
      },
    ],
    default: 'getAll',
  },
];

export const webhookFields: INodeProperties[] = [
  // Create fields
  {
    displayName: 'Webhook URL',
    name: 'webhookUrl',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['create'],
      },
    },
    default: '',
    placeholder: 'https://example.com/webhook',
    description: 'The URL to receive webhook events',
  },
  {
    displayName: 'Events',
    name: 'events',
    type: 'multiOptions',
    required: true,
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['create'],
      },
    },
    options: WEBHOOK_EVENTS.map((event: string) => ({
      name: event.split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      value: event,
    })),
    default: [],
    description: 'Events to subscribe to',
  },
  {
    displayName: 'Options',
    name: 'webhookOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['create'],
      },
    },
    options: [
      {
        displayName: 'Secret',
        name: 'secret',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        description: 'Secret for webhook signature verification',
      },
    ],
  },
  // Delete field
  {
    displayName: 'Webhook ID',
    name: 'webhookId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['delete'],
      },
    },
    default: '',
    description: 'The ID of the webhook to delete',
  },
  // Get all options
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['getAll'],
      },
    },
    default: false,
    description: 'Whether to return all results or only up to a given limit',
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['getAll'],
        returnAll: [false],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 50,
    description: 'Max number of results to return',
  },
];

export async function executeWebhookOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject | IDataObject[];

  switch (operation) {
    case 'create': {
      const url = this.getNodeParameter('webhookUrl', i) as string;
      const events = this.getNodeParameter('events', i) as string[];
      const options = this.getNodeParameter('webhookOptions', i) as IDataObject;

      const body: IDataObject = {
        url,
        events,
      };

      if (options.secret) {
        body.secret = options.secret;
      }

      responseData = await attentiveApiRequest.call(this, 'POST', '/webhooks', body);
      break;
    }

    case 'getAll': {
      const returnAll = this.getNodeParameter('returnAll', i) as boolean;

      if (returnAll) {
        responseData = await attentiveApiRequestAllItems.call(
          this,
          'GET',
          '/webhooks',
          {},
          {},
          'webhooks',
        );
      } else {
        const limit = this.getNodeParameter('limit', i) as number;
        const response = await attentiveApiRequest.call(this, 'GET', '/webhooks', {}, { limit });
        responseData = (response.webhooks as IDataObject[]) || [];
      }
      break;
    }

    case 'delete': {
      const webhookId = this.getNodeParameter('webhookId', i) as string;

      await attentiveApiRequest.call(this, 'DELETE', `/webhooks/${webhookId}`);
      responseData = { success: true, webhookId };
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
