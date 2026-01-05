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
  getTimestamp,
  buildReturnData,
} from '../../utils';

export const customEventOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['customEvent'],
      },
    },
    options: [
      {
        name: 'Send',
        value: 'send',
        description: 'Send a custom event',
        action: 'Send custom event',
      },
      {
        name: 'Send Batch',
        value: 'sendBatch',
        description: 'Send multiple custom events',
        action: 'Send batch custom events',
      },
    ],
    default: 'send',
  },
];

export const customEventFields: INodeProperties[] = [
  // Send single event
  {
    displayName: 'Event Type',
    name: 'eventType',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['customEvent'],
        operation: ['send'],
      },
    },
    default: '',
    placeholder: 'product_reviewed',
    description: 'The type/name of the custom event',
  },
  {
    displayName: 'Identifier Type',
    name: 'identifierType',
    type: 'options',
    required: true,
    displayOptions: {
      show: {
        resource: ['customEvent'],
        operation: ['send'],
      },
    },
    options: [
      { name: 'Phone', value: 'phone' },
      { name: 'Email', value: 'email' },
    ],
    default: 'phone',
    description: 'How to identify the user',
  },
  {
    displayName: 'Phone Number',
    name: 'phone',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['customEvent'],
        operation: ['send'],
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
        resource: ['customEvent'],
        operation: ['send'],
        identifierType: ['email'],
      },
    },
    default: '',
    placeholder: 'name@email.com',
    description: 'Email address of the user',
  },
  {
    displayName: 'Options',
    name: 'eventOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['customEvent'],
        operation: ['send'],
      },
    },
    options: [
      {
        displayName: 'Occurred At',
        name: 'occurredAt',
        type: 'dateTime',
        default: '',
        description: 'When the event occurred (defaults to now)',
      },
      {
        displayName: 'External ID',
        name: 'externalId',
        type: 'string',
        default: '',
        description: 'External reference ID',
      },
      {
        displayName: 'Properties',
        name: 'properties',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'attributes',
            displayName: 'Properties',
            values: [
              {
                displayName: 'Key',
                name: 'key',
                type: 'string',
                default: '',
                description: 'Property name',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'Property value',
              },
            ],
          },
        ],
        description: 'Custom properties for the event',
      },
    ],
  },
  // Batch send
  {
    displayName: 'Events',
    name: 'events',
    type: 'fixedCollection',
    typeOptions: {
      multipleValues: true,
    },
    required: true,
    displayOptions: {
      show: {
        resource: ['customEvent'],
        operation: ['sendBatch'],
      },
    },
    default: {},
    options: [
      {
        name: 'event',
        displayName: 'Event',
        values: [
          {
            displayName: 'Event Type',
            name: 'type',
            type: 'string',
            default: '',
            description: 'The type/name of the custom event',
          },
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
        ],
      },
    ],
    description: 'List of events to send',
  },
];

export async function executeCustomEventOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject;

  switch (operation) {
    case 'send': {
      const eventType = this.getNodeParameter('eventType', i) as string;
      const identifierType = this.getNodeParameter('identifierType', i) as string;
      const options = this.getNodeParameter('eventOptions', i) as IDataObject;

      const body: IDataObject = {
        type: eventType,
      };

      if (identifierType === 'phone') {
        const phone = formatPhoneNumber(this.getNodeParameter('phone', i) as string);
        validatePhoneNumber(phone, this);
        body.user = { phone };
      } else {
        const email = this.getNodeParameter('email', i) as string;
        body.user = { email };
      }

      body.occurredAt = getTimestamp(options.occurredAt as string | undefined);

      if (options.externalId) {
        body.externalId = options.externalId;
      }

      if (options.properties) {
        const props = parseCustomAttributes(options.properties as IDataObject);
        if (Object.keys(props).length > 0) {
          body.properties = props;
        }
      }

      responseData = await attentiveApiRequest.call(
        this,
        'POST',
        '/events/custom',
        cleanObject(body),
      );
      break;
    }

    case 'sendBatch': {
      const eventsInput = this.getNodeParameter('events', i) as IDataObject;
      const eventsList = eventsInput.event as IDataObject[] | undefined;
      const events: IDataObject[] = [];

      if (eventsList && Array.isArray(eventsList)) {
        for (const event of eventsList) {
          const eventBody: IDataObject = {
            type: event.type as string,
            occurredAt: getTimestamp(),
          };

          if (event.phone) {
            const phone = formatPhoneNumber(event.phone as string);
            validatePhoneNumber(phone, this);
            eventBody.user = { phone };
          } else if (event.email) {
            eventBody.user = { email: event.email };
          }

          events.push(eventBody);
        }
      }

      responseData = await attentiveApiRequest.call(this, 'POST', '/events/custom/batch', {
        events,
      });
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
