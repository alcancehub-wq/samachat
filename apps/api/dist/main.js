"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
require("./observability/otel");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const express = __importStar(require("express"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const requiredEnv = ['REDIS_URL', 'DATABASE_URL', 'PROVIDER_SECRET'];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    process.env.SAMACHAT_SERVICE = process.env.SAMACHAT_SERVICE || 'api';
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: true });
    const appConfig = (0, config_1.getConfig)();
    const logger = (0, logger_1.getLogger)({ service: 'api' });
    if (missingEnv.length > 0) {
        logger.error({ missingEnv }, 'Missing required env vars');
    }
    const maxBodyBytes = 1024 * 1024;
    app.use(express.json({
        limit: maxBodyBytes,
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use(express.urlencoded({ extended: true, limit: maxBodyBytes }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Samachat API')
        .setDescription('Samachat API base')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('docs', app, document);
    const port = Number(process.env.PORT) || appConfig.ports.api;
    await app.listen(port, '0.0.0.0');
    logger.info({ port }, 'API listening');
}
bootstrap();
