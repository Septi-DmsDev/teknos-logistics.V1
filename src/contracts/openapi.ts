const bearerAuth = [{ bearerAuth: [] }]

export const openApiContract = {
  openapi: '3.1.0',
  info: {
    title: 'Teknos Logistics API',
    version: '0.6.0',
    description: 'Contract-first logistics API for merchant rate quoting, shipment booking, tracking, and courier webhook ingestion.',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local development' },
    { url: 'https://logistics.teknos.id', description: 'Production placeholder' },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Merchant API' },
    { name: 'Courier Webhooks' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        responses: {
          '200': { description: 'Service is reachable' },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check with database connectivity',
        responses: {
          '200': { description: 'Service and database are reachable' },
          '500': { description: 'Database or internal dependency is unavailable' },
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Health'],
        summary: 'Machine-readable OpenAPI contract',
        responses: {
          '200': { description: 'OpenAPI document' },
        },
      },
    },
    '/v1/couriers/capabilities': {
      get: {
        tags: ['Merchant API'],
        summary: 'List courier capability matrix',
        description: 'Read-only capability metadata for supported and skeleton courier providers. No secrets or credentials are returned.',
        security: bearerAuth,
        responses: {
          '200': {
            description: 'Courier capability list',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CourierCapabilityResponse' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },    '/v1/rates': {
      post: {
        tags: ['Merchant API'],
        summary: 'Quote shipment rates',
        description: 'Non-mutating merchant endpoint. JNE tariff calls must not create AWB/resi.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RateRequest' } } },
        },
        responses: {
          '200': {
            description: 'Normalized courier rates',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RateResponse' } } },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '503': { $ref: '#/components/responses/ProviderUnavailable' },
        },
      },
    },
    '/v1/shipments': {
      post: {
        tags: ['Merchant API'],
        summary: 'Create or reuse a shipment',
        description: 'Idempotent by merchant and external_order_id. Real JNE booking creates AWB/resi and requires operator approval before manual validation.',
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ShipmentRequest' } } },
        },
        responses: {
          '201': {
            description: 'Shipment created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ShipmentBookingResponse' } } },
          },
          '200': {
            description: 'Existing idempotent shipment reused',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ShipmentBookingResponse' } } },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '503': { $ref: '#/components/responses/ProviderUnavailable' },
        },
      },
    },
    '/v1/shipments/{id}/tracking': {
      get: {
        tags: ['Merchant API'],
        summary: 'Get shipment tracking history',
        security: bearerAuth,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Shipment and ordered tracking events',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ShipmentTrackingResponse' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { description: 'Shipment not found for merchant' },
        },
      },
    },
    '/admin/audit-logs': {
      get: {
        tags: ['Health'],
        summary: 'List sanitized admin audit logs',
        description: 'Internal admin endpoint for mutation audit visibility. Responses contain metadata only and never include request bodies, tokens, API keys, or secrets.',
        security: bearerAuth,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'method', in: 'query', schema: { type: 'string', enum: ['POST', 'PUT', 'PATCH', 'DELETE'] } },
          { name: 'path', in: 'query', schema: { type: 'string' } },
          { name: 'status_min', in: 'query', schema: { type: 'integer', minimum: 100, maximum: 599 } },
          { name: 'status_max', in: 'query', schema: { type: 'integer', minimum: 100, maximum: 599 } },
        ],
        responses: {
          '200': { description: 'Sanitized admin audit logs' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/webhooks/jne': {
      post: {
        tags: ['Courier Webhooks'],
        summary: 'Receive JNE lifecycle webhook',
        description: 'Courier ingress endpoint protected by shared token and normalized event-key idempotency.',
        parameters: [
          { name: 'x-jne-token', in: 'header', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: {
          '200': { description: 'Webhook accepted or deduplicated' },
          '401': { description: 'Invalid webhook token' },
          '404': { description: 'Shipment not found for webhook payload' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
    },
    responses: {
      Unauthorized: { description: 'Missing or invalid API key' },
      ValidationError: { description: 'Request validation failed' },
      ProviderUnavailable: { description: 'Courier provider unavailable or not configured' },
    },
    schemas: {
      CourierCode: { type: 'string', enum: ['JNE', 'JNT', 'SAP_EXPRESS', 'MOCK'] },
      ShipmentStatus: { type: 'string', enum: ['DRAFT', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED'] },
      CourierCapability: {
        type: 'object',
        required: ['courier', 'displayName', 'implementationStatus', 'supportsRates', 'supportsBooking', 'supportsTracking', 'supportsWebhook', 'destinationCodeFormat', 'notes'],
        properties: {
          courier: { $ref: '#/components/schemas/CourierCode' },
          displayName: { type: 'string' },
          implementationStatus: { type: 'string', enum: ['ACTIVE', 'SKELETON', 'PLANNED'] },
          supportsRates: { type: 'boolean' },
          supportsBooking: { type: 'boolean' },
          supportsTracking: { type: 'boolean' },
          supportsWebhook: { type: 'boolean' },
          destinationCodeFormat: { type: 'string' },
          notes: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
      CourierCapabilityResponse: {
        type: 'object',
        required: ['couriers'],
        properties: { couriers: { type: 'array', items: { $ref: '#/components/schemas/CourierCapability' } } },
        additionalProperties: false,
      },
      RateRequest: {
        type: 'object',
        required: ['origin_code', 'dest_code', 'weight_grams'],
        properties: {
          origin_code: { type: 'string', minLength: 3, maxLength: 32 },
          dest_code: { type: 'string', minLength: 3, maxLength: 32 },
          weight_grams: { type: 'integer', minimum: 1, maximum: 100000 },
          couriers: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/CourierCode' } },
        },
        additionalProperties: false,
      },
      Rate: {
        type: 'object',
        required: ['courier', 'serviceCode', 'serviceName', 'priceIdr', 'etd', 'cached'],
        properties: {
          courier: { $ref: '#/components/schemas/CourierCode' },
          serviceCode: { type: 'string' },
          serviceName: { type: 'string' },
          priceIdr: { type: 'integer', minimum: 0 },
          etd: { type: 'string' },
          cached: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      RateResponse: {
        type: 'object',
        required: ['rates'],
        properties: { rates: { type: 'array', items: { $ref: '#/components/schemas/Rate' } } },
        additionalProperties: false,
      },
      ShipmentRequest: {
        type: 'object',
        required: ['external_order_id', 'service_code', 'origin_code', 'dest_code', 'weight_grams', 'recipient'],
        properties: {
          external_order_id: { type: 'string', minLength: 1, maxLength: 64 },
          courier: { $ref: '#/components/schemas/CourierCode', default: 'MOCK' },
          service_code: { type: 'string', minLength: 1, maxLength: 32 },
          service_name: { type: 'string', maxLength: 80 },
          origin_code: { type: 'string', minLength: 3, maxLength: 32 },
          dest_code: { type: 'string', minLength: 3, maxLength: 32 },
          weight_grams: { type: 'integer', minimum: 1, maximum: 100000 },
          rate_idr: { type: 'integer', minimum: 0 },
          goods_value_idr: { type: 'integer', minimum: 0 },
          is_cod: { type: 'boolean' },
          recipient: { $ref: '#/components/schemas/Recipient' },
        },
        additionalProperties: false,
      },
      Recipient: {
        type: 'object',
        required: ['name', 'phone', 'address'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
          phone: { type: 'string', minLength: 6, maxLength: 32 },
          address: { type: 'string', minLength: 5, maxLength: 500 },
        },
        additionalProperties: false,
      },
      Shipment: {
        type: 'object',
        required: ['id', 'externalOrderId', 'courier', 'status', 'waybillId', 'serviceCode', 'serviceName', 'originCode', 'destCode', 'weightGrams', 'rateIdr', 'bookedAt', 'deliveredAt', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string' },
          externalOrderId: { type: 'string' },
          courier: { $ref: '#/components/schemas/CourierCode' },
          status: { $ref: '#/components/schemas/ShipmentStatus' },
          waybillId: { type: ['string', 'null'] },
          serviceCode: { type: 'string' },
          serviceName: { type: ['string', 'null'] },
          originCode: { type: 'string' },
          destCode: { type: 'string' },
          weightGrams: { type: 'integer' },
          rateIdr: { type: ['integer', 'null'] },
          bookedAt: { type: ['string', 'null'], format: 'date-time' },
          deliveredAt: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        additionalProperties: false,
      },
      ShipmentBookingResponse: {
        type: 'object',
        required: ['shipment', 'idempotent'],
        properties: {
          shipment: { $ref: '#/components/schemas/Shipment' },
          idempotent: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      ShipmentTrackingResponse: {
        type: 'object',
        required: ['shipment', 'tracking'],
        properties: {
          shipment: { $ref: '#/components/schemas/Shipment' },
          tracking: { type: 'array', items: { $ref: '#/components/schemas/TrackingEvent' } },
        },
        additionalProperties: false,
      },
      TrackingEvent: {
        type: 'object',
        required: ['id', 'status', 'description', 'occurredAt', 'createdAt'],
        properties: {
          id: { type: 'string' },
          status: { $ref: '#/components/schemas/ShipmentStatus' },
          description: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        additionalProperties: false,
      },
    },
  },
} as const
