import * as buffer from "node:buffer";
import { TextDecoder, TextEncoder } from "node:util"; // (ESM style imports)

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.Notification = class {} as any;

declare global {
  interface Crypto {
    randomUUID: () => `${string}-${string}-${string}-${string}-${string}`;
  }
}

jest.mock("axios", () => ({}));
jest.mock("hackathon-demo/libs/components", () => ({}));
