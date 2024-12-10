"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = wait;
async function wait(millis = 500) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
