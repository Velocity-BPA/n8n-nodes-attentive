/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { attentiveApiRequest, attentiveApiRequestAllItems } from '../../transport';
import { cleanObject, buildReturnData } from '../../utils';

export const segmentOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['segment'],
      },
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new segment',
        action: 'Create segment',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete a segment',
        action: 'Delete segment',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get segment details',
        action: 'Get segment',
      },
      {
        name: 'Get All',
        value: 'getAll',
        description: 'Get all segments',
        action: 'Get all segments',
      },
      {
        name: 'Get Members',
        value: 'getMembers',
        description: 'Get segment members',
        action: 'Get segment members',
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update a segment',
        action: 'Update segment',
      },
    ],
    default: 'getAll',
  },
];

export const segmentFields: INodeProperties[] = [
  // Segment ID for get, update, delete, getMembers
  {
    displayName: 'Segment ID',
    name: 'segmentId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['segment'],
        operation: ['get', 'update', 'delete', 'getMembers'],
      },
    },
    default: '',
    description: 'The ID of the segment',
  },
  // Create fields
  {
    displayName: 'Segment Name',
    name: 'segmentName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['segment'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Name of the segment',
  },
  {
    displayName: 'Description',
    name: 'description',
    type: 'string',
    displayOptions: {
      show: {
        resource: ['segment'],
        operation: ['create'],
      },
    },
    default: '',
    description: 'Description of the segment',
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
        resource: ['segment'],
        operation: ['update'],
      },
    },
    options: [
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        description: 'New name for the segment',
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        default: '',
        description: 'New description for the segment',
      },
    ],
  },
  // Get all options
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['segment'],
        operation: ['getAll', 'getMembers'],
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
        resource: ['segment'],
        operation: ['getAll', 'getMembers'],
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

export async function executeSegmentOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  let responseData: IDataObject | IDataObject[];

  switch (operation) {
    case 'create': {
      const name = this.getNodeParameter('segmentName', i) as string;
      const description = this.getNodeParameter('description', i, '') as string;

      const body: IDataObject = {
        name,
      };

      if (description) {
        body.description = description;
      }

      responseData = await attentiveApiRequest.call(
        this,
        'POST',
        '/segments',
        cleanObject(body),
      );
      break;
    }

    case 'get': {
      const segmentId = this.getNodeParameter('segmentId', i) as string;

      responseData = await attentiveApiRequest.call(this, 'GET', `/segments/${segmentId}`);
      break;
    }

    case 'getAll': {
      const returnAll = this.getNodeParameter('returnAll', i) as boolean;

      if (returnAll) {
        responseData = await attentiveApiRequestAllItems.call(
          this,
          'GET',
          '/segments',
          {},
          {},
          'segments',
        );
      } else {
        const limit = this.getNodeParameter('limit', i) as number;
        const response = await attentiveApiRequest.call(this, 'GET', '/segments', {}, { limit });
        responseData = (response.segments as IDataObject[]) || [];
      }
      break;
    }

    case 'update': {
      const segmentId = this.getNodeParameter('segmentId', i) as string;
      const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

      const body: IDataObject = {};

      if (updateFields.name) {
        body.name = updateFields.name;
      }

      if (updateFields.description) {
        body.description = updateFields.description;
      }

      responseData = await attentiveApiRequest.call(
        this,
        'PATCH',
        `/segments/${segmentId}`,
        cleanObject(body),
      );
      break;
    }

    case 'delete': {
      const segmentId = this.getNodeParameter('segmentId', i) as string;

      await attentiveApiRequest.call(this, 'DELETE', `/segments/${segmentId}`);
      responseData = { success: true, segmentId };
      break;
    }

    case 'getMembers': {
      const segmentId = this.getNodeParameter('segmentId', i) as string;
      const returnAll = this.getNodeParameter('returnAll', i) as boolean;

      if (returnAll) {
        responseData = await attentiveApiRequestAllItems.call(
          this,
          'GET',
          `/segments/${segmentId}/members`,
          {},
          {},
          'members',
        );
      } else {
        const limit = this.getNodeParameter('limit', i) as number;
        const response = await attentiveApiRequest.call(
          this,
          'GET',
          `/segments/${segmentId}/members`,
          {},
          { limit },
        );
        responseData = (response.members as IDataObject[]) || [];
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return buildReturnData(responseData);
}
