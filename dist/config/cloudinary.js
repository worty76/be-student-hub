"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryUpload = exports.cloudinary = void 0;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
const config_1 = __importDefault(require("./config"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: config_1.default.CLOUDINARY_CLOUD_NAME,
    api_key: config_1.default.CLOUDINARY_API_KEY,
    api_secret: config_1.default.CLOUDINARY_API_SECRET
});
// Create storage engine
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'studenthub',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 1000, crop: 'limit' }]
    }
});
// Configure multer
const cloudinaryUpload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
exports.cloudinaryUpload = cloudinaryUpload;
