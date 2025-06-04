import swaggerJsdoc from "swagger-jsdoc";
import config from "../config/config";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "StudentHub API",
      version: "1.0.0",
      description:
        "A second-hand marketplace for students to buy, sell, chat, comment, and post items",
      contact: {
        name: "API Support",
        email: "support@studenthub.com",
      },
    },
    servers: [
      {
        url: "https://studenthub-production.up.railway.app",
        description: "Production server",
      },
      {
        url: `http://localhost:${config.PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: ["./src/routes/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
