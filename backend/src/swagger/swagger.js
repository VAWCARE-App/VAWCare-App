const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VAWCare API Documentation",
      version: "1.0.0",
      description:
        "API documentation for VAWCare Application - User Management System. Note: victimID is auto-generated and should not be included in registration requests.",
      contact: {
        name: "VAWCare Support",
        email: "support@vawcare.com",
      },
    },
    paths: {
      "/api/victims/register": {
        post: {
          tags: ["Victims"],
          summary: "Register a new victim (anonymous or regular)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VictimRegistration" }
              }
            }
          },
          responses: {
            201: { description: "Victim registered" },
            400: { description: "Bad request" }
          }
        }
      },
      "/api/victims/login": {
        post: {
          tags: ["Victims"],
          summary: "Login a victim",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VictimLogin" }
              }
            }
          },
          responses: {
            200: { description: "Logged in (returns token)" },
            401: { description: "Invalid credentials" }
          }
        }
      },
      "/api/victims/profile": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Victims"],
          summary: "Get current victim profile",
          responses: { 200: { description: "Victim profile", content: { "application/json": { schema: { $ref: "#/components/schemas/VictimProfile" } } } }, 401: { description: "Unauthorized" } }
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ["Victims"],
          summary: "Update current victim profile",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VictimUpdate" } } } },
          responses: { 200: { description: "Profile updated" }, 400: { description: "Validation error" } }
        }
      },
      "/api/victims/verify-email": {
        post: {
          tags: ["Victims"],
          summary: "Verify victim email (sends verification token)",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { email: { type: "string", format: "email" } }, required: ["email"] } } } },
          responses: { 200: { description: "Verification sent" }, 400: { description: "Bad request" } }
        }
      },
      "/api/victims/verify-phone": {
        post: {
          tags: ["Victims"],
          summary: "Verify victim phone (sends OTP)",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { phone: { type: "string" } }, required: ["phone"] } } } },
          responses: { 200: { description: "OTP sent" }, 400: { description: "Bad request" } }
        }
      },
      "/api/victims/anonymous/report": {
        post: {
          tags: ["Victims"],
          summary: "Submit anonymous incident report",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AnonymousReportCreate" } } } },
          responses: { 201: { description: "Report created" }, 400: { description: "Bad request" } }
        }
      },
      "/api/victims/anonymous/alert": {
        post: {
          tags: ["Victims"],
          summary: "Send an anonymous alert (SOS)",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AnonymousAlertCreate" } } } },
          responses: { 201: { description: "Alert created" }, 400: { description: "Bad request" } }
        }
      },
      "/api/victims/metrics": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Victims"],
          summary: "Get simple victim metrics (reports, cases, recent activities)",
          responses: { 200: { description: "Metrics returned", content: { "application/json": { schema: { $ref: "#/components/schemas/MetricsResponse" } } } }, 401: { description: "Unauthorized" } }
        }
      },
      "/api/victims/reports": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Victims"],
          summary: "Get victim's incident reports",
          responses: { 200: { description: "List of reports", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/IncidentReport" } } } } }, 401: { description: "Unauthorized" } }
        }
      },
      "/api/victims/reports/{id}": {
        put: {
          security: [{ bearerAuth: [] }],
          tags: ["Victims"],
          summary: "Update a victim's report",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReportUpdate" } } } },
          responses: { 200: { description: "Report updated" }, 404: { description: "Not found" } }
        }
      },
      "/api/reports": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Reports"],
          summary: "Get all incident reports",
          description:
            "Returns all incident reports. No query parameters are required to retrieve all reports. This endpoint is protected and requires a bearer token with admin or barangay_official role.",
          responses: {
            200: {
              description: "List of reports",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/IncidentReport" },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
          },
        },
        post: {
          tags: ["Reports"],
          summary: "Create an incident report",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReportCreate" },
              },
            },
          },
          responses: {
            201: {
              description: "Report created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IncidentReport" },
                },
              },
            },
            400: { description: "Bad request" },
          },
        },
      },
      "/api/reports/{id}": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Reports"],
          summary: "Get a single report by reportID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Report found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IncidentReport" },
                },
              },
            },
            404: { description: "Not found" },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ["Reports"],
          summary: "Update a report (status, assignedOfficer, riskLevel)",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReportUpdate" },
              },
            },
          },
          responses: {
            200: {
              description: "Report updated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IncidentReport" },
                },
              },
            },
            404: { description: "Not found" },
          },
        },
      },
      "/api/admin/register": {
        post: {
          tags: ["Admins"],
          summary: "Register a new admin",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminRegistration" } } } },
          responses: { 201: { description: "Admin registered" }, 400: { description: "Bad request" } }
        }
      },
      "/api/admin/login": {
        post: {
          tags: ["Admins"],
          summary: "Admin login",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminLogin" } } } },
          responses: { 200: { description: "Logged in" }, 401: { description: "Invalid credentials" } }
        }
      },
      "/api/admin/users": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Admins"],
          summary: "Get all users (admins, victims, officials)",
          responses: { 200: { description: "List of users" }, 401: { description: "Unauthorized" } }
        }
      },
      "/api/admin/officials": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Admins"],
          summary: "List barangay officials",
          responses: { 200: { description: "List of officials" }, 401: { description: "Unauthorized" } }
        },
        post: {
          security: [{ bearerAuth: [] }],
          tags: ["Admins"],
          summary: "Register a barangay official",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OfficialRegistration" } } } },
          responses: { 201: { description: "Official registered" }, 400: { description: "Bad request" } }
        }
      },
      "/api/admin/officials/{id}": {
        put: {
          security: [{ bearerAuth: [] }],
          tags: ["Admins"],
          summary: "Update a barangay official",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OfficialRegistration" } } } },
          responses: { 200: { description: "Official updated" }, 404: { description: "Not found" } }
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ["Admins"],
          summary: "Delete a barangay official",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Official deleted" }, 404: { description: "Not found" } }
        }
      },
      "/api/cases": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Cases"],
          summary: "Get all cases",
          description: "Returns all cases. Requires authentication.",
          responses: {
            200: {
              description: "List of cases",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Case" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Cases"],
          summary: "Create a new case from an existing report",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CaseCreate" },
              },
            },
          },
          responses: {
            201: {
              description: "Case created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Case" },
                },
              },
            },
            400: { description: "Bad request" },
          },
        },
      },
      "/api/cases/{id}": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["Cases"],
          summary: "Get a case by caseID or _id",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Case found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Case" },
                },
              },
            },
            404: { description: "Not found" },
          },
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ["Cases"],
          summary: "Update a case",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CaseUpdate" },
              },
            },
          },
          responses: {
            200: {
              description: "Case updated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Case" },
                },
              },
            },
            404: { description: "Not found" },
          },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ["Cases"],
          summary: "Soft-delete a case",
          description:
            "Performs a soft delete by marking the case as deleted (sets `deleted=true` and `deletedAt`). The record is not removed from the database.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Case soft-deleted" },
            404: { description: "Not found" },
          },
        },
      },
      "/api/bpo": {
        get: {
          security: [{ bearerAuth: [] }],
          tags: ["BPO"],
          summary: "List BPOs",
          description: "Returns all BPOs (excludes soft-deleted records).",
          responses: {
            200: {
              description: "List of BPOs",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { type: "array", items: { $ref: "#/components/schemas/BPO" } }
                    }
                  }
                }
              }
            },
            401: { description: "Unauthorized" }
          }
        },
        post: {
          tags: ["BPO"],
          summary: "Create a new Barangay Protection Order (BPO)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BPOCreate" }
              }
            }
          },
          responses: {
            201: { description: "BPO created", content: { "application/json": { schema: { $ref: "#/components/schemas/BPO" } } } },
            400: { description: "Bad request" }
          }
        }
      },
      "/api/bpo/{id}": {
        get: {
          tags: ["BPO"],
          summary: "Get a BPO by bpoID or _id",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "BPO found", content: { "application/json": { schema: { $ref: "#/components/schemas/BPO" } } } }, 404: { description: "Not found" } }
        },
        put: {
          security: [{ bearerAuth: [] }],
          tags: ["BPO"],
          summary: "Update a BPO (restricted fields: status, copyReceivedBy, servedBy, dateReceived, punongBarangay, barangaykagawad, controlNO)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BPOUpdate" } } } },
          responses: { 200: { description: "BPO updated", content: { "application/json": { schema: { $ref: "#/components/schemas/BPO" } } } }, 404: { description: "Not found" } }
        },
        delete: {
          security: [{ bearerAuth: [] }],
          tags: ["BPO"],
          summary: "Soft-delete a BPO",
          description: "Performs a soft delete by marking the BPO as deleted (sets `deleted=true` and `deletedAt`). The record is not removed from the database.",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "BPO soft-deleted" }, 404: { description: "Not found" } }
        }
      },
      "/api/auth/send-otp": {
        post: {
          tags: ["Authentication"],
          summary: "Send OTP to user email",
          description: "Sends a one-time password (OTP) to the user's registered email address for password reset.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "OTP sent successfully.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { message: { type: "string", example: "OTP sent successfully." } },
                  },
                },
              },
            },
            404: { description: "Email not found." },
            500: { description: "Failed to send OTP." },
          },
        },
      },

      "/api/auth/verify-otp": {
        post: {
          tags: ["Authentication"],
          summary: "Verify the OTP code sent to user's email",
          description: "Validates whether the provided OTP matches the one sent to the user's email address.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "otp"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                    otp: { type: "string", example: "123456" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "OTP verified successfully.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { message: { type: "string", example: "OTP verified successfully." } },
                  },
                },
              },
            },
            400: { description: "Invalid or expired OTP." },
            404: { description: "User not found." },
            500: { description: "Error verifying OTP." },
          },
        },
      },

      "/api/auth/reset-password": {
        post: {
          tags: ["Authentication"],
          summary: "Reset user password using verified email",
          description: "Resets the user's password after successful OTP verification.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                    password: { type: "string", format: "password", example: "MySecurePass123!" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Password reset successfully.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { message: { type: "string", example: "Password reset successfully." } },
                  },
                },
              },
            },
            404: { description: "User not found." },
            500: { description: "Error resetting password." },
          },
        },
      },
        "/api/officials/register": {
          post: {
            tags: ["Officials"],
            summary: "Register a new barangay official",
            description: "Creates a new Barangay Official account. Account will be created with status 'pending' until approved by admins. This creates a Firebase user and a MongoDB record.",
            requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OfficialRegistration" } } } },
            responses: { 201: { description: "Official registered (pending approval)" }, 400: { description: "Bad request or already exists" }, 500: { description: "Server error" } }
          }
        },
        "/api/officials/login": {
          post: {
            tags: ["Officials"],
            summary: "Login as a barangay official",
            requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OfficialLogin" } } } },
            responses: { 200: { description: "Login successful (returns Firebase custom token)" }, 401: { description: "Invalid credentials or not approved" } }
          }
        },
        "/api/officials/forgot-password": {
          post: {
            tags: ["Officials"],
            summary: "Request password reset email for official",
            requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { officialEmail: { type: "string", format: "email" } }, required: ["officialEmail"] } } } },
            responses: { 200: { description: "Password reset email sent (if account exists)" } }
          }
        },
        "/api/officials/verify-email": {
          post: {
            security: [{ bearerAuth: [] }],
            tags: ["Officials"],
            summary: "Generate email verification link for the authenticated official",
            responses: { 200: { description: "Verification link generated" }, 400: { description: "Error generating link" } }
          }
        },
        "/api/officials/verify-phone": {
          post: {
            security: [{ bearerAuth: [] }],
            tags: ["Officials"],
            summary: "Verify phone number for the authenticated official",
            requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { phoneNumber: { type: "string" }, verificationCode: { type: "string" } } } } } },
            responses: { 200: { description: "Phone number verified" }, 400: { description: "Verification failed" } }
          }
        },
        "/api/officials/profile": {
          get: {
            security: [{ bearerAuth: [] }],
            tags: ["Officials"],
            summary: "Get authenticated official's profile",
            responses: { 200: { description: "Official profile", content: { "application/json": { schema: { $ref: "#/components/schemas/VictimProfile" } } } }, 404: { description: "Not found" } }
          },
          put: {
            security: [{ bearerAuth: [] }],
            tags: ["Officials"],
            summary: "Update authenticated official's profile",
            requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OfficialRegistration" } } } },
            responses: { 200: { description: "Profile updated" }, 400: { description: "Bad request" }, 404: { description: "Not found" } }
          }
        },
        "/api/officials/victims": {
          get: {
            security: [{ bearerAuth: [] }],
            tags: ["Officials"],
            summary: "Get all victims (official access)",
            responses: { 200: { description: "List of victims", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "object" } } } } } }, 401: { description: "Unauthorized" } }
          }
        },
      "/api/chatbot/message": {
        post: {
          tags: ["Chatbot"],
          summary: "Send a message to the VAWCare chatbot",
          description: "Sends a user message to the VAWCareBot and receives an AI-generated reply. The message is logged and stored in the database.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    message: { type: "string", example: "How do I report abuse?" }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: "Chatbot reply generated successfully.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      userMessage: {
                        type: "object",
                        description: "Saved user message document"
                      },
                      botReply: {
                        type: "string",
                        description: "AI-generated chatbot reply",
                        example: "You can report abuse at your Barangay VAW Desk or call the 1343 Actionline. All reports are confidential."
                      }
                    }
                  }
                }
              }
            },
            400: { description: "Message is required." },
            500: { description: "Failed to generate chatbot response." }
          }
        }
      },
    },


    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        // Incident report schemas for Swagger
        ReportCreate: {
          type: "object",
          description:
            "Create a new incident report. Do not include reportID — the server generates it automatically.",
          properties: {
            victimID: {
              type: "string",
              description: "Victim object id (required if not authenticated)",
            },
            incidentType: {
              type: "string",
              enum: ["Physical", "Sexual", "Psychological", "Economic"],
            },
            description: { type: "string" },
            location: { type: "string" },
            dateReported: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["Open", "Under Investigation", "Resolved"],
            },
            // assignedOfficer and riskLevel removed from schema
            perpetrator: {
              type: "string",
              description: "Name or description of perpetrator (optional)",
            },
          },
          required: ["incidentType", "description", "location"],
          example: {
            victimID: "",
            incidentType: "Physical",
            description:
              "Victim reports an assault near Barangay Hall at night; suspect unknown.",
            perpetrator: "Unknown",
            location: "Barangay Hall, Street 5, Barangay X",
          },
          examples: {
            withVictim: {
              summary: "Example including victimID",
              value: {
                victimID: "64b1f3a0e9d1f2a6c4b12345",
                incidentType: "Physical",
                description:
                  "Victim reports an assault near Barangay Hall at night; suspect unknown.",
                perpetrator: "Unknown",
                location: "Barangay Hall, Street 5, Barangay X",
              },
            },
          },
        },
        ReportUpdate: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["Pending", "Open", "Under Investigation", "Resolved"],
            },
            status: {
              type: "string",
              enum: ["Open", "Under Investigation", "Resolved"],
            },
            // assignedOfficer and riskLevel removed from update schema
            description: { type: "string" },
            perpetrator: {
              type: "string",
              description: "Name or description of perpetrator (optional)",
            },
            location: { type: "string" },
          },
          example: {
            status: "Under Investigation",
            perpetrator: "John Doe",
          },
        },
        IncidentReport: {
          type: "object",
          properties: {
            reportID: { type: "string" },
            victimID: { type: "string" },
            incidentType: { type: "string" },
            description: { type: "string" },
            perpetrator: {
              type: "string",
              description: "Name or description of perpetrator (optional)",
            },
            location: { type: "string" },
            dateReported: { type: "string", format: "date-time" },
            status: { type: "string" },
            // assignedOfficer and riskLevel removed from response schema
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CaseCreate: {
          type: "object",
          description: "Create a new Case based on an existing report",
          properties: {
            caseID: { type: "string" },
            reportID: { type: "string" },
            victimName: { type: "string", description: "Full name of the victim (first, middle initial, last). Required." },
            victimID: { type: "string" },
            incidentType: { type: "string" },
            description: { type: "string" },
            perpetrator: { type: "string" },
            location: { type: "string" },
            dateReported: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["Open", "Under Investigation", "Resolved", "Closed"],
            },
            assignedOfficer: { type: "string" },
            riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
          },
          required: [
            "caseID",
            "reportID",
            "victimID",
            "victimName",
            "incidentType",
            "description",
          ],
        },
        CaseUpdate: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["Open", "Pending", "Investigating", "Closed"],
            },
            status: {
              type: "string",
              enum: ["Open", "Under Investigation", "Resolved", "Closed"],
            },
            victimName: { type: "string", description: "Full name of the victim (can be updated)" },
            assignedOfficer: { type: "string" },
            riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
            description: { type: "string" },
          },
        },
        Case: {
          type: "object",
          properties: {
            _id: { type: "string" },
            caseID: { type: "string" },
            reportID: { type: "string" },
            victimName: { type: "string" },
            victimID: { type: "string" },
            incidentType: { type: "string" },
            description: { type: "string" },
            perpetrator: { type: "string" },
            location: { type: "string" },
            dateReported: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["Open", "Under Investigation", "Resolved", "Closed"],
            },
            assignedOfficer: { type: "string" },
            riskLevel: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        VictimRegistration: {
          type: "object",
          description:
            "Schema for victim registration. Note: victimID is auto-generated, do not include it in the request.",
          additionalProperties: false,
          properties: {
            victimAccount: {
              type: "string",
              enum: ["regular", "anonymous"],
              default: "anonymous",
              description: "Type of victim account",
            },
            victimUsername: {
              type: "string",
              minLength: 4,
              description:
                "Username for login (required for both regular and anonymous)",
            },
            victimPassword: {
              type: "string",
              minLength: 8,
              description: "Password for the account",
            },
            victimEmail: {
              type: "string",
              format: "email",
              description: "Email address (optional)",
            },
            victimType: {
              type: "string",
              enum: ["Child", "Woman"],
              description: "Type of victim (required for regular users)",
            },
            firstName: {
              type: "string",
              description: "First name (required for regular users)",
            },
            lastName: {
              type: "string",
              description: "Last name (required for regular users)",
            },
            middleInitial: {
              type: "string",
              description: "Middle initial (optional)",
            },
            address: {
              type: "string",
              description: "Address (required for regular users)",
            },
            contactNumber: {
              type: "string",
              description: "Contact number (required for regular users)",
            },
            location: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" },
              },
            },
          },
          required: ["victimUsername", "victimPassword"],
          // Default inline example: use the regular registration format so anonymous users may omit fields
          // Default example used by Swagger UI 'Try it out' (matches frontend shape)
          example: {
            victimAccount: "anonymous",
            victimUsername: "",
            victimPassword: "",
            victimType: "Woman",
            victimEmail: "",
            firstName: "",
            lastName: "",
            middleInitial: "",
            address: "",
            contactNumber: "",
            location: { lat: 0, lng: 0 },
          },
          // Named examples: Swagger UI will show these in the Try it out editor
          examples: {
            anonymous: {
              summary: "Anonymous account example",
              value: {
                victimAccount: "anonymous",
                victimUsername: "anonymous001",
                victimPassword: "Victim@123",
                victimType: "Woman",
                firstName: "",
                lastName: "",
                victimEmail: "",
              },
            },
            regular: {
              summary: "Regular account example",
              value: {
                victimAccount: "regular",
                victimUsername: "jdoe",
                victimPassword: "SecurePass!23",
                victimType: "Woman",
                victimEmail: "jane.doe@example.com",
                firstName: "Jane",
                lastName: "Doe",
                middleInitial: "A",
                address: "123 Main St, Barangay X",
                contactNumber: "+639123456789",
                location: { lat: 14.5995, lng: 120.9842 },
              },
            },
          },
        },
        BPOCreate: {
          type: "object",
          description: "Create a new Barangay Protection Order. Do not include bpoID — server will generate it if omitted.",
          properties: {
            controlNO: { type: "string" },
            nameofRespondent: { type: "string" },
            address: { type: "string" },
            applicationName: { type: "string" },
            orderDate: { type: "string", format: "date-time" },
            statement: { type: "string" },
            hisOrher: { type: "string" },
            nameofChildren: { type: "string" },
            dateIssued: { type: "string", format: "date-time" },
            copyReceivedBy: { type: "string" },
            dateReceived: { type: "string", format: "date-time" },
            servedBy: { type: "string" },
            punongBarangay: { type: "string" },
            barangaykagawad: { type: "string" },
            expiryDate: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["Active", "Expired", "Revoked"] }
          },
          required: ["nameofRespondent", "applicationName"]
        },
        BPOUpdate: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["Active", "Expired", "Revoked"] },
            copyReceivedBy: { type: "string" },
            servedBy: { type: "string" },
            dateReceived: { type: "string", format: "date-time" },
            punongBarangay: { type: "string" },
            barangaykagawad: { type: "string" },
            controlNO: { type: "string" }
          }
        },
        BPO: {
          type: "object",
          properties: {
            _id: { type: "string" },
            bpoID: { type: "string" },
            controlNO: { type: "string" },
            nameofRespondent: { type: "string" },
            address: { type: "string" },
            applicationName: { type: "string" },
            orderDate: { type: "string", format: "date-time" },
            statement: { type: "string" },
            nameofChildren: { type: "string" },
            dateIssued: { type: "string", format: "date-time" },
            copyReceivedBy: { type: "string" },
            dateReceived: { type: "string", format: "date-time" },
            servedBy: { type: "string" },
            punongBarangay: { type: "string" },
            barangaykagawad: { type: "string" },
            expiryDate: { type: "string", format: "date-time" },
            status: { type: "string" },
            deleted: { type: "boolean" },
            deletedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        VictimLogin: {
          type: "object",
          properties: {
            identifier: {
              type: "string",
              description: "Username or email for login",
            },
            password: {
              type: "string",
              description: "Account password",
            },
          },
          required: ["identifier", "password"],
        },
        VictimRegistration: {
          type: "object",
          properties: {
            victimAccount: { type: "string", enum: ["anonymous", "regular"], example: "anonymous" },
            victimUsername: { type: "string" },
            victimPassword: { type: "string" },
            victimEmail: { type: "string", format: "email" },
            firstName: { type: "string" },
            middleInitial: { type: "string" },
            lastName: { type: "string" },
            address: { type: "string" },
            contactNumber: { type: "string" },
            emergencyContacts: { type: "array", items: { type: "object" } },
            location: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } } }
          },
          required: ["victimAccount"]
        },
        VictimProfile: {
          type: "object",
          properties: {
            id: { type: "string" },
            victimID: { type: "string" },
            victimAccount: { type: "string" },
            victimUsername: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            victimEmail: { type: "string", format: "email" },
            contactNumber: { type: "string" },
            location: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } } }
          }
        },
        VictimUpdate: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            middleInitial: { type: "string" },
            lastName: { type: "string" },
            address: { type: "string" },
            contactNumber: { type: "string" }
          }
        },
        AnonymousReportCreate: {
          type: "object",
          properties: {
            incidentType: { type: "string" },
            details: { type: "string" },
            location: { type: "object", properties: { latitude: { type: "number" }, longitude: { type: "number" } } },
            victimID: { type: "string" }
          },
          required: ["victimID"]
        },
        AnonymousAlertCreate: {
          type: "object",
          properties: {
            alertType: { type: "string", example: "Emergency" },
            location: { type: "object", properties: { latitude: { type: "number" }, longitude: { type: "number" } } },
            victimID: { type: "string" }
          },
          required: ["victimID"]
        },
        MetricsResponse: {
          type: "object",
          properties: {
            totalReports: { type: "integer" },
            openCases: { type: "integer" },
            recentActivities: { type: "array", items: { type: "object" } }
          }
        },
        AdminLogin: {
          type: "object",
          properties: {
            adminEmail: {
              type: "string",
              format: "email",
              description: "Admin email address",
            },
            adminPassword: {
              type: "string",
              description: "Admin password",
            },
          },
          required: ["adminEmail", "adminPassword"],
        },
        AdminRegistration: {
          type: "object",
          properties: {
            adminID: {
              type: "string",
              description: "Unique admin identifier",
            },
            adminEmail: {
              type: "string",
              format: "email",
              description: "Admin email address",
            },
            adminRole: {
              type: "string",
              enum: ["backend", "supervisor"],
              description: "Admin role type",
            },
            firstName: {
              type: "string",
              description: "Admin first name",
            },
            middleInitial: {
              type: "string",
              description: "Admin middle initial",
            },
            lastName: {
              type: "string",
              description: "Admin last name",
            },
            adminPassword: {
              type: "string",
              minLength: 8,
              description: "Admin password",
            },
          },
          required: [
            "adminID",
            "adminEmail",
            "adminRole",
            "firstName",
            "lastName",
            "adminPassword",
          ],
        },
        OfficialRegistration: {
          type: "object",
          properties: {
            officialID: {
              type: "string",
              description: "Unique official identifier",
            },
            officialEmail: {
              type: "string",
              format: "email",
              description: "Official email address",
            },
            firstName: {
              type: "string",
              description: "Official first name",
            },
            middleInitial: {
              type: "string",
              description: "Official middle initial",
            },
            lastName: {
              type: "string",
              description: "Official last name",
            },
            position: {
              type: "string",
              enum: [
                "Barangay Captain",
                "Kagawad",
                "Secretary",
                "Treasurer",
                "SK Chairman",
                "Chief Tanod",
              ],
              description: "Official position",
            },
            officialPassword: {
              type: "string",
              minLength: 8,
              description: "Official password",
            },
            contactNumber: {
              type: "string",
              description: "Official contact number",
            },
          },
          required: [
            "officialID",
            "officialEmail",
            "firstName",
            "lastName",
            "position",
            "officialPassword",
            "contactNumber",
          ],
        },
        OfficialLogin: {
          type: "object",
          properties: {
            officialEmail: { type: "string", format: "email" },
            password: { type: "string" }
          },
          required: ["officialEmail", "password"]
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs;
