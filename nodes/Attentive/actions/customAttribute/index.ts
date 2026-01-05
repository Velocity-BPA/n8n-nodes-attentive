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

export const customAttributeOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['customAttribute'],
      },
    },
    options: [
      {
        name: 'Delete',
        value: 'delete',
        description: 'Remove a custom attribute',
        action: 'Delete custom attribute',
      },
      {
        name: 'Set',
        value: 'set',
        description: 'Set custom attribute value',
        action: 'Set custom attribute',
      },
      {
        name: 'Set Batch',
        value: 'setBatch',
        description: 'Set multiple custom attributes',
        action: 'Set batch custom attributes',
      },
    ],
    default: 'set',
  },
];

export const customAttributeFields: INodeProperties[] = [
  // Common identifier fields
  {
    displayName: 'Identifier Type',
    name: 'identifierType',
    type: 'options',
    required: true,
    displayOptions: {
      show: {
        resource: ['customAttribute'],
        operation: ['set', 'delete'],
      },
    },
    options: [
      { name: 'Phone', value: 'phone' },
      { name: 'Email', value: 'email' },
    ],
    default: 'phone',
    description: 'How to identify the subscriber',
  },
  {
    displayName: 'Phone Number',
    name: 'phone',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['customAttribute'],
        operation: ['set', 'delete'],
        identifierType: ['phone'],
      },
    },
    default: '',
    placeholder: '+19148440001',
    description: 'Phone number in E.164 format',
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['customAttribute'],
        operation: ['set', 'delete'],
        identifierType: ['email'],
      },
    },
    default: '',
    placeholder: 'name@email.com',
    description: 'Email address of the subscriber',
  },
  // Set operation fields
  {
    displayName: 'Attributes',
    name: 'attributes',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['customAttribute'],
        operation: ['set'],
      },
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
    description: 'Custom attributes to set',
  },
  // Delete operation fields
  {
    displayName: 'Attribute Key',
    name: 'attributeKey',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['customAttribute'],
        operation: ['delete'],
      },
    },
    default: '',
    description: 'The attribute key to delete',
  },
  // Batch set fields
  {
    displayName: 'Subscribers',
    name: 'subscribers',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['customAttribute'],
        operation: ['setBatch'],
      },
    },
    default: {},
    options: [
      {
        name: 'subscriber',
        displayName: 'Subscriber',
        values: [
          {
            displayName: 'Phone Number',
            name: 'phone',
            type: 'string',
            default: '',
            placeholder: '+19148440001',
            description: 'Phone number in E.164 format',
          },
          {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
            placeholder: 'name@email.com',
            description: 'Email address (alternative to phone)',
          },
          {
            displayName: 'Attribute Key',
            name: 'key',
            type: 'string',
            default: '',
            description: 'Attribute name',
          },
          {
            displayName: 'Attribute Value',
            name: 'value',
            type: 'string',
            default: '',
            description: 'Attribute value',
          },
        ],
      },
    ],
    description: 'List of subscribers with attributes to set',
  },
];

export async function executeCustomAttributeOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject;

  switch (operation) {
    case 'set': {
      const identifierType = this.getNodeParameter('identifierType', i) as string;
      const attributesInput = this.getNodeParameter('attributes', i) as IDataObject;

      const body: IDataObject = {};

      if (identifierType === 'phone') {
        const phone = formatPhoneNumber(this.getNodeParameter('phone', i) as string);
        validatePhoneNumber(phone, this);
        body.user = { phone };
      } else {
        const email = this.getNodeParameter('email', i) as string;
        body.user = { email };
      }

      const attributes = parseCustomAttributes(attributesInput);
      body.properties = attributes;

      responseData = await attentiveApiRequest.call(
        this,
        'POST',
        '/attributes/custom',
        cleanObject(body),
      );
      break;
    }

    case 'setBatch': {
      const subscribersInput = this.getNodeParameter('subscribers', i) as IDataObject;
      const subscribersList = subscribersInput.subscriber as IDataObject[] | undefined;
      const updates: IDataObject[] = [];

      if (subscribersList && Array.isArray(subscribersList)) {
        for (const sub of subscribersList) {
          const update: IDataObject = {
            properties: {
              [sub.key as string]: sub.value,
            },
          };

          if (sub.phone) {
            const phone = formatPhoneNumber(sub.phone as string);
            validatePhoneNumber(phone, this);
            update.user = { phone };
          } else if (sub.email) {
            update.user = { email: sub.email };
          }

          updates.push(update);
        }
      }

      responseData = await attentiveApiRequest.call(this, 'POST', '/attributes/custom/batch', {
        updates,
      });
      break;
    }

    case 'delete': {
      const identifierType = this.getNodeParameter('identifierType', i) as string;
      const attributeKey = this.getNodeParameter('attributeKey', i) as string;

      const body: IDataObject = {
        attributeKey,
      };

      if (identifierType === 'phone') {
        const phone = formatPhoneNumber(this.getNodeParameter('phone', i) as string);
        validatePhoneNumber(phone, this);
        body.user = { phone };
      } else {
        const email = this.getNodeParameter('email', i) as string;
        body.user = { email };
      }

      responseData = await attentiveApiRequest.call(
        this,
        'DELETE',
        '/attributes/custom',
        cleanObject(body),
      );
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
