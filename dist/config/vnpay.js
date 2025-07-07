"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vnpayConfig = void 0;
exports.vnpayConfig = {
    vnp_TmnCode: process.env.VNP_TMNCODE || "JZH20A58",
    vnp_HashSecret: process.env.VNP_HASHSECRET,
    vnp_Url: process.env.VNP_URL,
    vnp_Api: process.env.VNP_API,
    vnp_ReturnUrl: process.env.CLIENT_URL || "http://localhost:3000/payment/result"
};
