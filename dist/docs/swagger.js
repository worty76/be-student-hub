"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const config_1 = __importDefault(require("../config/config"));
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "StudentHub API",
            version: "1.0.0",
            description: "A second-hand marketplace for students to buy, sell, chat, comment, and post items",
            contact: {
                name: "API Support",
                email: "support@studenthub.com",
            },
        },
        servers: [
            {
                url: "https://be-student-hub-production.up.railway.app",
                description: "Production server",
            },
            {
                url: `http://localhost:${config_1.default.PORT}`,
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = swaggerSpec;
