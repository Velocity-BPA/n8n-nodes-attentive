/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { attentiveApiRequest } from '../../transport';
import {
  formatPhoneNumber,
  validatePhoneNumber,
  cleanObject,
  parseCustomAttributes,
  buildReturnData,
} from '../../utils';

export const subscriberOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['subscriber'],
      },
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Get subscription status for a subscriber',
        action: 'Get subscriber status',
      },
      {
        name: 'Subscribe',
        value: 'subscribe',
        description: 'Opt-in a subscriber',
        action: 'Subscribe a user',
      },
      {
        name: 'Unsubscribe',
        value: 'unsubscribe',
        description: 'Opt-out a subscriber',
        action: 'Unsubscribe a user',
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update subscriber attributes',
        action: 'Update subscriber',
      },
    ],
    default: 'subscribe',
  },
];

export const subscriberFields: INodeProperties[] = [
  // Subscribe fields
  {
    displayName: 'Phone Number',
    name: 'phone',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['subscriber'],
        operation: ['subscribe', 'unsubscribe', 'get', 'update'],
      },
    },
    default: '',
    placeholder: '+19148440001',
    description: 'Phone number in E.164 format (e.g., +19148440001)',
  },
  {
    displayName: 'Sign-Up Source ID',
    name: 'signUpSourceId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['subscriber'],
        operation: ['subscribe'],
      },
    },
    default: '',
    description: 'The sign-up source ID from your Attentive account',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['subscriber'],
        operation: ['subscribe'],
      },
    },
    options: [
      {
        displayName: 'Email',
        name: 'email',
        type: 'string',
        default: '',
        placeholder: 'name@email.com',
        description: 'Email address of the subscriber',
      },
      {
        displayName: 'Subscription Type',
        name: 'subscriptionType',
        type: 'options',
        options: [
          { name: 'Marketing', value: 'MARKETING' },
          { name: 'Transactional', value: 'TRANSACTIONAL' },
        ],
        default: 'MARKETING',
        description: 'Type of subscription',
      },
      {
        displayName: 'Locale',
        name: 'locale',
        type: 'string',
        default: 'en-US',
        description: 'Locale code (e.g., en-US)',
      },
      {
        displayName: 'Notifications Enabled',
        name: 'notifications',
        type: 'boolean',
        default: true,
        description: 'Whether to enable notifications',
      },
      {
        displayName: 'Custom Attributes',
        name: 'customAttributes',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'attributes',
            displayName: 'Attributes',
            values: [
              {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
                description: 'Attribute name',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Attribute value',
              },
            ],
          },
        ],
        description: 'Custom attributes to set for the subscriber',
      },
      {
        displayName: 'External Identifier Key',
        name: 'externalIdKey',
        type: 'string',
        default: '',
        description: 'External identifier key',
      },
      {
        displayName: 'External Identifier Value',
        name: 'externalIdValue',
        type: 'string',
        default: '',
        description: 'External identifier value',
      },
    ],
  },
  // Update fields
  {
    displayName: 'Update Fields',
    name: 'updateFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        resource: ['subscriber'],
        operation: ['update'],
      },
    },
    options: [
      {
        displayName: 'Email',
        name: 'email',
        type: 'string',
        default: '',
        placeholder: 'name@email.com',
        description: 'Email address of the subscriber',
      },
      {
        displayName: 'Locale',
        name: 'locale',
        type: 'string',
        default: '',
        description: 'Locale code (e.g., en-US)',
      },
      {
        displayName: 'Custom Attributes',
        name: 'customAttributes',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'attributes',
            displayName: 'Attributes',
            values: [
              {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
                description: 'Attribute name',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Attribute value',
              },
            ],
          },
        ],
        description: 'Custom attributes to update',
      },
    ],
  },
  // Unsubscribe fields
  {
    displayName: 'Notification',
    name: 'notification',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['subscriber'],
        operation: ['unsubscribe'],
      },
    },
    description: 'Whether to send an opt-out confirmation message',
  },
];

export async function executeSubscriberOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject;

  const phone = formatPhoneNumber(this.getNodeParameter('phone', i) as string);
  validatePhoneNumber(phone, this);

  switch (operation) {
    case 'subscribe': {
      const signUpSourceId = this.getNodeParameter('signUpSourceId', i) as string;
      const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

      const body: IDataObject = {
        user: {
          phone,
        },
        signUpSourceId,
      };

      if (additionalFields.email) {
        (body.user as IDataObject).email = additionalFields.email;
      }

      if (additionalFields.subscriptionType) {
        body.subscriptionType = additionalFields.subscriptionType;
      }

      if (additionalFields.locale) {
        body.locale = additionalFields.locale;
      }

      if (additionalFields.notifications !== undefined) {
        body.notifications = additionalFields.notifications;
      }

      if (additionalFields.customAttributes) {
        const customAttrs = parseCustomAttributes(additionalFields.customAttributes as IDataObject);
        if (Object.keys(customAttrs).length > 0) {
          body.customAttributes = customAttrs;
        }
      }

      if (additionalFields.externalIdKey && additionalFields.externalIdValue) {
        body.externalIdentifiers = {
          [additionalFields.externalIdKey as string]: additionalFields.externalIdValue,
        };
      }

      responseData = await attentiveApiRequest.call(this, 'POST', '/subscriptions', cleanObject(body));
      break;
    }

    case 'unsubscribe': {
      const notification = this.getNodeParameter('notification', i, false) as boolean;

      const body: IDataObject = {
        user: {
          phone,
        },
        notification,
      };

      responseData = await attentiveApiRequest.call(this, 'POST', '/subscriptions/unsubscribe', body);
      break;
    }

    case 'get': {
      responseData = await attentiveApiRequest.call(this, 'GET', '/subscriptions', {}, { phone });
      break;
    }

    case 'update': {
      const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

      const body: IDataObject = {
        user: {
          phone,
        },
      };

      if (updateFields.email) {
        (body.user as IDataObject).email = updateFields.email;
      }

      if (updateFields.locale) {
        body.locale = updateFields.locale;
      }

      if (updateFields.customAttributes) {
        const customAttrs = parseCustomAttributes(updateFields.customAttributes as IDataObject);
        if (Object.keys(customAttrs).length > 0) {
          body.customAttributes = customAttrs;
        }
      }

      responseData = await attentiveApiRequest.call(this, 'PATCH', '/subscribers', cleanObject(body));
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
