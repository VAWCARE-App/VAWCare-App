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
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
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
          required: ['victimUsername', 'victimPassword']
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
            adminPassword: {
              type: 'string',
              minLength: 8,
              description: 'Official password'
            },
            contactNumber: {
              type: 'string',
              description: 'Official contact number'
            }
          },
          required: ['officialID', 'officialEmail', 'firstName', 'lastName', 'position', 'adminPassword', 'contactNumber']
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
