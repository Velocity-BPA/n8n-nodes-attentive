/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import { logLicensingNotice } from './utils';

// Import operations and fields
import { subscriberOperations, subscriberFields, executeSubscriberOperation } from './actions/subscriber';
import { messageOperations, messageFields, executeMessageOperation } from './actions/message';
import { customEventOperations, customEventFields, executeCustomEventOperation } from './actions/customEvent';
import { customAttributeOperations, customAttributeFields, executeCustomAttributeOperation } from './actions/customAttribute';
import { ecommerceOperations, ecommerceFields, executeEcommerceOperation } from './actions/ecommerce';
import { segmentOperations, segmentFields, executeSegmentOperation } from './actions/segment';
import { journeyOperations, journeyFields, executeJourneyOperation } from './actions/journey';
import { signUpUnitOperations, signUpUnitFields, executeSignUpUnitOperation } from './actions/signUpUnit';
import { keywordOperations, keywordFields, executeKeywordOperation } from './actions/keyword';
import { webhookOperations, webhookFields, executeWebhookOperation } from './actions/webhook';

export class Attentive implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Attentive',
    name: 'attentive',
    icon: 'file:attentive.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with the Attentive SMS Marketing API',
    defaults: {
      name: 'Attentive',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'attentiveApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Custom Attribute',
            value: 'customAttribute',
          },
          {
            name: 'Custom Event',
            value: 'customEvent',
          },
          {
            name: 'eCommerce',
            value: 'ecommerce',
          },
          {
            name: 'Journey',
            value: 'journey',
          },
          {
            name: 'Keyword',
            value: 'keyword',
          },
          {
            name: 'Message',
            value: 'message',
          },
          {
            name: 'Segment',
            value: 'segment',
          },
          {
            name: 'Sign-Up Unit',
            value: 'signUpUnit',
          },
          {
            name: 'Subscriber',
            value: 'subscriber',
          },
          {
            name: 'Webhook',
            value: 'webhook',
          },
        ],
        default: 'subscriber',
      },
      // Operations
      ...subscriberOperations,
      ...messageOperations,
      ...customEventOperations,
      ...customAttributeOperations,
      ...ecommerceOperations,
      ...segmentOperations,
      ...journeyOperations,
      ...signUpUnitOperations,
      ...keywordOperations,
      ...webhookOperations,
      // Fields
      ...subscriberFields,
      ...messageFields,
      ...customEventFields,
      ...customAttributeFields,
      ...ecommerceFields,
      ...segmentFields,
      ...journeyFields,
      ...signUpUnitFields,
      ...keywordFields,
      ...webhookFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Log licensing notice once per node load
    logLicensingNotice();

    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result: INodeExecutionData[];

        switch (resource) {
          case 'subscriber':
            result = await executeSubscriberOperation.call(this, operation, i);
            break;
          case 'message':
            result = await executeMessageOperation.call(this, operation, i);
            break;
          case 'customEvent':
            result = await executeCustomEventOperation.call(this, operation, i);
            break;
          case 'customAttribute':
            result = await executeCustomAttributeOperation.call(this, operation, i);
            break;
          case 'ecommerce':
            result = await executeEcommerceOperation.call(this, operation, i);
            break;
          case 'segment':
            result = await executeSegmentOperation.call(this, operation, i);
            break;
          case 'journey':
            result = await executeJourneyOperation.call(this, operation, i);
            break;
          case 'signUpUnit':
            result = await executeSignUpUnitOperation.call(this, operation, i);
            break;
          case 'keyword':
            result = await executeKeywordOperation.call(this, operation, i);
            break;
          case 'webhook':
            result = await executeWebhookOperation.call(this, operation, i);
            break;
          default:
            throw new Error(`Unknown resource: ${resource}`);
        }

        returnData.push(...result);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
