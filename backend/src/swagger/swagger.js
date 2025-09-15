const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VAWCare API Documentation',
      version: '1.0.0',
      description: 'API documentation for VAWCare Application - User Management System. Note: victimID is auto-generated and should not be included in registration requests.',
      contact: {
        name: 'VAWCare Support',
        email: 'support@vawcare.com'
      }
    },
    paths: {
      '/api/reports': {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ['Reports'],
          summary: 'Get all incident reports',
          description: 'Returns all incident reports. No query parameters are required to retrieve all reports. This endpoint is protected and requires a bearer token with admin or barangay_official role.',
          responses: {
            '200': { description: 'List of reports', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/IncidentReport' } } } } },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' }
          }
        },
        post: {
          tags: ['Reports'],
          summary: 'Create an incident report',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReportCreate' }
              }
            }
          },
          responses: {
            '201': { description: 'Report created', content: { 'application/json': { schema: { $ref: '#/components/schemas/IncidentReport' } } } },
            '400': { description: 'Bad request' }
          }
        }
      },
      '/api/reports/{id}': {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ['Reports'],
          summary: 'Get a single report by reportID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Report found', content: { 'application/json': { schema: { $ref: '#/components/schemas/IncidentReport' } } } }, '404': { description: 'Not found' } }
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ['Reports'],
          summary: 'Update a report (status, assignedOfficer, riskLevel)',
          parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string' } } ],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportUpdate' } } } },
          responses: { '200': { description: 'Report updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/IncidentReport' } } } }, '404': { description: 'Not found' } }
        }
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        // Incident report schemas for Swagger
        ReportCreate: {
          type: 'object',
          description: 'Create a new incident report. Do not include reportID — the server generates it automatically.',
          properties: {
            victimID: { type: 'string', description: 'Victim object id (required if not authenticated)' },
            incidentType: { type: 'string', enum: ['Physical', 'Sexual', 'Psychological', 'Economic'] },
            description: { type: 'string' },
            location: { type: 'string' },
            dateReported: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['Pending', 'Open' , 'Under Investigation', 'Resolved'] },
            // assignedOfficer and riskLevel removed from schema
            perpetrator: { type: 'string', description: 'Name or description of perpetrator (optional)' }
          },
          required: ['incidentType', 'description', 'location'],
          example: {
            "victimID": "",
            "incidentType": "Physical",
            "description": "Victim reports an assault near Barangay Hall at night; suspect unknown.",
            "perpetrator": "Unknown",
            "location": "Barangay Hall, Street 5, Barangay X",
            
          }
          ,
          examples: {
            withVictim: {
              summary: 'Example including victimID',
              value: {
                "victimID": "64b1f3a0e9d1f2a6c4b12345",
                "incidentType": "Physical",
                "description": "Victim reports an assault near Barangay Hall at night; suspect unknown.",
                "perpetrator": "Unknown",
                "location": "Barangay Hall, Street 5, Barangay X",
                
              }
            }
          }
        },
        ReportUpdate: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['Pending', 'Open' , 'Under Investigation', 'Resolved'] },
            // assignedOfficer and riskLevel removed from update schema
            description: { type: 'string' },
            perpetrator: { type: 'string', description: 'Name or description of perpetrator (optional)' },
            location: { type: 'string' },
          }
          ,
          example: {
            "status": "Under Investigation",
            "perpetrator": "John Doe"
          }
        },
        IncidentReport: {
          type: 'object',
          properties: {
            reportID: { type: 'string' },
            victimID: { type: 'string' },
            incidentType: { type: 'string' },
            description: { type: 'string' },
            perpetrator: { type: 'string', description: 'Name or description of perpetrator (optional)' },
            location: { type: 'string' },
            dateReported: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            // assignedOfficer and riskLevel removed from response schema
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        VictimRegistration: {
          type: 'object',
          description: 'Schema for victim registration. Note: victimID is auto-generated, do not include it in the request.',
          additionalProperties: false,
          properties: {
            victimAccount: {
              type: 'string',
              enum: ['regular', 'anonymous'],
              default: 'anonymous',
              description: 'Type of victim account'
            },
            victimUsername: {
              type: 'string',
              minLength: 4,
              description: 'Username for login (required for both regular and anonymous)'
            },
            victimPassword: {
              type: 'string',
              minLength: 8,
              description: 'Password for the account'
            },
            victimEmail: {
              type: 'string',
              format: 'email',
              description: 'Email address (optional)'
            },
            victimType: {
              type: 'string',
              enum: ['Child', 'Woman'],
              description: 'Type of victim (required for regular users)'
            },
            firstName: {
              type: 'string',
              description: 'First name (required for regular users)'
            },
            lastName: {
              type: 'string',
              description: 'Last name (required for regular users)'
            },
            middleInitial: {
              type: 'string',
              description: 'Middle initial (optional)'
            },
            address: {
              type: 'string',
              description: 'Address (required for regular users)'
            },
            contactNumber: {
              type: 'string',
              description: 'Contact number (required for regular users)'
            },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' }
              }
            }
          },
          required: ['victimUsername', 'victimPassword'],
          // Default inline example: use the regular registration format so anonymous users may omit fields
          // Default example used by Swagger UI 'Try it out' (matches frontend shape)
          example: {
            victimAccount: 'anonymous',
            victimUsername: '',
            victimPassword: '',
            victimType: 'Woman',
            victimEmail: '',
            firstName: '',
            lastName: '',
            middleInitial: '',
            address: '',
            contactNumber: '',
            location: { lat: 0, lng: 0 }
          },
          // Named examples: Swagger UI will show these in the Try it out editor
          examples: {
            anonymous: {
              summary: 'Anonymous account example',
              value: {
                victimAccount: 'anonymous',
                victimUsername: 'anonymous001',
                victimPassword: 'Victim@123',
                victimType: 'Woman',
                firstName: '',
                lastName: '',
                victimEmail: ''
              }
            },
            regular: {
              summary: 'Regular account example',
              value: {
                victimAccount: 'regular',
                victimUsername: 'jdoe',
                victimPassword: 'SecurePass!23',
                victimType: 'Woman',
                victimEmail: 'jane.doe@example.com',
                firstName: 'Jane',
                lastName: 'Doe',
                middleInitial: 'A',
                address: '123 Main St, Barangay X',
                contactNumber: '+639123456789',
                location: { lat: 14.5995, lng: 120.9842 }
              }
            }
          }
        },
        VictimLogin: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Username or email for login'
            },
            password: {
              type: 'string',
              description: 'Account password'
            }
          },
          required: ['identifier', 'password']
        },
        AdminLogin: {
          type: 'object',
          properties: {
            adminEmail: {
              type: 'string',
              format: 'email',
              description: 'Admin email address'
            },
            adminPassword: {
              type: 'string',
              description: 'Admin password'
            }
          },
          required: ['adminEmail', 'adminPassword']
        },
        AdminRegistration: {
          type: 'object',
          properties: {
            adminID: {
              type: 'string',
              description: 'Unique admin identifier'
            },
            adminEmail: {
              type: 'string',
              format: 'email',
              description: 'Admin email address'
            },
            adminRole: {
              type: 'string',
              enum: ['backend', 'supervisor'],
              description: 'Admin role type'
            },
            firstName: {
              type: 'string',
              description: 'Admin first name'
            },
            middleInitial: {
              type: 'string',
              description: 'Admin middle initial'
            },
            lastName: {
              type: 'string',
              description: 'Admin last name'
            },
            adminPassword: {
              type: 'string',
              minLength: 8,
              description: 'Admin password'
            }
          },
          required: ['adminID', 'adminEmail', 'adminRole', 'firstName', 'lastName', 'adminPassword']
        },
        OfficialRegistration: {
          type: 'object',
          properties: {
            officialID: {
              type: 'string',
              description: 'Unique official identifier'
            },
            officialEmail: {
              type: 'string',
              format: 'email',
              description: 'Official email address'
            },
            firstName: {
              type: 'string',
              description: 'Official first name'
            },
            middleInitial: {
              type: 'string',
              description: 'Official middle initial'
            },
            lastName: {
              type: 'string',
              description: 'Official last name'
            },
            position: {
              type: 'string',
              enum: ['Barangay Captain', 'Kagawad', 'Secretary', 'Treasurer', 'SK Chairman', 'Chief Tanod'],
              description: 'Official position'
            },
            officialPassword: {
              type: 'string',
              minLength: 8,
              description: 'Official password'
            },
            contactNumber: {
              type: 'string',
              description: 'Official contact number'
            }
          },
          required: ['officialID', 'officialEmail', 'firstName', 'lastName', 'position', 'officialPassword', 'contactNumber']
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js'] // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs;
