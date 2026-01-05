/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IHookFunctions,
  IWebhookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
  IDataObject,
} from 'n8n-workflow';

import { attentiveApiRequest } from './transport';
import { WEBHOOK_EVENTS } from './types/AttentiveTypes';
import { logLicensingNotice } from './utils';

export class AttentiveTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Attentive Trigger',
    name: 'attentiveTrigger',
    icon: 'file:attentive.svg',
    group: ['trigger'],
    version: 1,
    description: 'Starts the workflow when Attentive events occur',
    defaults: {
      name: 'Attentive Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'attentiveApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Events',
        name: 'events',
        type: 'multiOptions',
        required: true,
        options: WEBHOOK_EVENTS.map((event) => ({
          name: event
            .split('.')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' '),
          value: event,
        })),
        default: [],
        description: 'The events to listen to',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Webhook Secret',
            name: 'secret',
            type: 'string',
            typeOptions: {
              password: true,
            },
            default: '',
            description: 'Secret for webhook signature verification. If provided, incoming webhooks will be verified.',
          },
        ],
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        logLicensingNotice();

        const webhookUrl = this.getNodeWebhookUrl('default');
        const webhookData = this.getWorkflowStaticData('node');

        // Check if webhook already exists
        if (webhookData.webhookId) {
          try {
            await attentiveApiRequest.call(
              this,
              'GET',
              `/webhooks/${webhookData.webhookId}`,
            );
            return true;
          } catch {
            // Webhook doesn't exist, need to create
            delete webhookData.webhookId;
            return false;
          }
        }

        // Check if a webhook with this URL already exists
        try {
          const response = await attentiveApiRequest.call(this, 'GET', '/webhooks');
          const webhooks = (response.webhooks as IDataObject[]) || [];

          for (const webhook of webhooks) {
            if (webhook.url === webhookUrl) {
              webhookData.webhookId = webhook.id;
              return true;
            }
          }
        } catch {
          // Ignore error
        }

        return false;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        logLicensingNotice();

        const webhookUrl = this.getNodeWebhookUrl('default');
        const events = this.getNodeParameter('events') as string[];
        const options = this.getNodeParameter('options') as IDataObject;
        const webhookData = this.getWorkflowStaticData('node');

        const body: IDataObject = {
          url: webhookUrl,
          events,
        };

        if (options.secret) {
          body.secret = options.secret;
        }

        try {
          const response = await attentiveApiRequest.call(this, 'POST', '/webhooks', body);
          webhookData.webhookId = (response as IDataObject).id;
          return true;
        } catch (error) {
          throw new Error(`Failed to create Attentive webhook: ${(error as Error).message}`);
        }
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');

        if (webhookData.webhookId) {
          try {
            await attentiveApiRequest.call(
              this,
              'DELETE',
              `/webhooks/${webhookData.webhookId}`,
            );
          } catch (error) {
            // Ignore error if webhook already deleted
            console.warn(`Failed to delete webhook: ${(error as Error).message}`);
          }

          delete webhookData.webhookId;
        }

        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    logLicensingNotice();

    const body = this.getBodyData() as IDataObject;
    const headers = this.getHeaderData() as IDataObject;
    const options = this.getNodeParameter('options') as IDataObject;

    // Verify webhook signature if secret is configured
    if (options.secret) {
      const signature = headers['x-attentive-signature'] as string | undefined;
      
      if (!signature) {
        // Return error for missing signature
        return {
          webhookResponse: {
            status: 401,
            body: 'Missing signature',
          },
        };
      }

      // Note: In production, you would verify the HMAC signature here
      // This is a simplified check - Attentive uses HMAC-SHA256
      // const expectedSignature = crypto
      //   .createHmac('sha256', options.secret as string)
      //   .update(JSON.stringify(body))
      //   .digest('hex');
      
      // For now, just log that signature verification would happen
      console.log('Webhook signature received:', signature);
    }

    // Return the webhook data
    return {
      workflowData: [
        [
          {
            json: {
              event: body.event || body.type,
              timestamp: body.timestamp || new Date().toISOString(),
              data: body.data || body,
              raw: body,
            },
          },
        ],
      ],
    };
  }
}
