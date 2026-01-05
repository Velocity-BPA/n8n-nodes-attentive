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
  buildReturnData,
} from '../../utils';

export const messageOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['message'],
      },
    },
    options: [
      {
        name: 'Send',
        value: 'send',
        description: 'Send a single SMS/MMS message',
        action: 'Send a message',
      },
      {
        name: 'Send Bulk',
        value: 'sendBulk',
        description: 'Send bulk messages to multiple recipients',
        action: 'Send bulk messages',
      },
      {
        name: 'Send Transactional',
        value: 'sendTransactional',
        description: 'Send a transactional message',
        action: 'Send transactional message',
      },
    ],
    default: 'send',
  },
];

export const messageFields: INodeProperties[] = [
  // Send fields
  {
    displayName: 'To Phone Number',
    name: 'to',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['send', 'sendTransactional'],
      },
    },
    default: '',
    placeholder: '+19148440001',
    description: 'Recipient phone number in E.164 format',
  },
  {
    displayName: 'Message Body',
    name: 'body',
    type: 'string',
    typeOptions: {
      rows: 4,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['send', 'sendBulk', 'sendTransactional'],
      },
    },
    default: '',
    description: 'The message content to send',
  },
  {
    displayName: 'Message Name',
    name: 'messageName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendTransactional'],
      },
    },
    default: '',
    description: 'Unique identifier for the transactional message template',
  },
  // Bulk send fields
  {
    displayName: 'Recipients',
    name: 'recipients',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendBulk'],
      },
    },
    default: {},
    options: [
      {
        name: 'recipient',
        displayName: 'Recipient',
        values: [
          {
            displayName: 'Phone Number',
            name: 'phone',
            type: 'string',
            default: '',
            placeholder: '+19148440001',
            description: 'Recipient phone number in E.164 format',
          },
        ],
      },
    ],
    description: 'List of recipients for bulk message',
  },
  // Additional fields for all send operations
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['send', 'sendBulk'],
      },
    },
    options: [
      {
        displayName: 'Subscription Type',
        name: 'subscriptionType',
        type: 'options',
        options: [
          { name: 'Marketing', value: 'MARKETING' },
          { name: 'Transactional', value: 'TRANSACTIONAL' },
        ],
        default: 'MARKETING',
        description: 'Type of message subscription',
      },
      {
        displayName: 'Media URL',
        name: 'mediaUrl',
        type: 'string',
        default: '',
        placeholder: 'https://example.com/image.jpg',
        description: 'URL of media to include (MMS). Must be publicly accessible.',
      },
      {
        displayName: 'Message Name',
        name: 'messageName',
        type: 'string',
        default: '',
        description: 'Optional identifier for the message',
      },
      {
        displayName: 'Use Short Links',
        name: 'useShortLinks',
        type: 'boolean',
        default: false,
        description: 'Whether to shorten URLs in the message',
      },
      {
        displayName: 'Skip Fatigue Rules',
        name: 'skipFatigue',
        type: 'boolean',
        default: false,
        description: 'Whether to skip message fatigue rules',
      },
      {
        displayName: 'External ID',
        name: 'externalId',
        type: 'string',
        default: '',
        description: 'External reference ID for tracking',
      },
    ],
  },
  // Transactional message options
  {
    displayName: 'Options',
    name: 'transactionalOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['message'],
        operation: ['sendTransactional'],
      },
    },
    options: [
      {
        displayName: 'Media URL',
        name: 'mediaUrl',
        type: 'string',
        default: '',
        placeholder: 'https://example.com/image.jpg',
        description: 'URL of media to include (MMS)',
      },
      {
        displayName: 'External ID',
        name: 'externalId',
        type: 'string',
        default: '',
        description: 'External reference ID for tracking',
      },
      {
        displayName: 'Variables',
        name: 'variables',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'variable',
            displayName: 'Variable',
            values: [
              {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
                description: 'Variable name',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Variable value',
              },
            ],
          },
        ],
        description: 'Template variables to merge into the message',
      },
    ],
  },
];

export async function executeMessageOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject;

  switch (operation) {
    case 'send': {
      const to = formatPhoneNumber(this.getNodeParameter('to', i) as string);
      validatePhoneNumber(to, this);

      const body = this.getNodeParameter('body', i) as string;
      const options = this.getNodeParameter('options', i) as IDataObject;

      const requestBody: IDataObject = {
        to,
        body,
      };

      if (options.subscriptionType) {
        requestBody.subscriptionType = options.subscriptionType;
      }

      if (options.mediaUrl) {
        requestBody.mediaUrl = options.mediaUrl;
      }

      if (options.messageName) {
        requestBody.messageName = options.messageName;
      }

      if (options.useShortLinks !== undefined) {
        requestBody.useShortLinks = options.useShortLinks;
      }

      if (options.skipFatigue !== undefined) {
        requestBody.skipFatigue = options.skipFatigue;
      }

      if (options.externalId) {
        requestBody.externalId = options.externalId;
      }

      responseData = await attentiveApiRequest.call(
        this,
        'POST',
        '/messages/send',
        cleanObject(requestBody),
      );
      break;
    }

    case 'sendBulk': {
      const body = this.getNodeParameter('body', i) as string;
      const recipientsInput = this.getNodeParameter('recipients', i) as IDataObject;
      const options = this.getNodeParameter('options', i) as IDataObject;

      const recipients: IDataObject[] = [];
      const recipientsList = recipientsInput.recipient as IDataObject[] | undefined;

      if (recipientsList && Array.isArray(recipientsList)) {
        for (const recipient of recipientsList) {
          const phone = formatPhoneNumber(recipient.phone as string);
          validatePhoneNumber(phone, this);
          recipients.push({ phone });
        }
      }

      const requestBody: IDataObject = {
        recipients,
        body,
      };

      if (options.subscriptionType) {
        requestBody.subscriptionType = options.subscriptionType;
      }

      if (options.mediaUrl) {
        requestBody.mediaUrl = options.mediaUrl;
      }

      if (options.messageName) {
        requestBody.messageName = options.messageName;
      }

      if (options.useShortLinks !== undefined) {
        requestBody.useShortLinks = options.useShortLinks;
      }

      responseData = await attentiveApiRequest.call(
        this,
        'POST',
        '/messages/bulk',
        cleanObject(requestBody),
      );
      break;
    }

    case 'sendTransactional': {
      const to = formatPhoneNumber(this.getNodeParameter('to', i) as string);
      validatePhoneNumber(to, this);

      const body = this.getNodeParameter('body', i) as string;
      const messageName = this.getNodeParameter('messageName', i) as string;
      const options = this.getNodeParameter('transactionalOptions', i) as IDataObject;

      const requestBody: IDataObject = {
        to,
        body,
        messageName,
        subscriptionType: 'TRANSACTIONAL',
      };

      if (options.mediaUrl) {
        requestBody.mediaUrl = options.mediaUrl;
      }

      if (options.externalId) {
        requestBody.externalId = options.externalId;
      }

      if (options.variables) {
        const variablesInput = options.variables as IDataObject;
        const variablesList = variablesInput.variable as IDataObject[] | undefined;
        if (variablesList && Array.isArray(variablesList)) {
          const variables: IDataObject = {};
          for (const v of variablesList) {
            if (v.key && v.value !== undefined) {
              variables[v.key as string] = v.value;
            }
          }
          if (Object.keys(variables).length > 0) {
            requestBody.variables = variables;
          }
        }
      }

      responseData = await attentiveApiRequest.call(
        this,
        'POST',
        '/messages/transactional',
        cleanObject(requestBody),
      );
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
