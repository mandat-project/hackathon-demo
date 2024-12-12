import { TextDecoder, TextEncoder } from 'node:util'; // (ESM style imports)

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.Notification = class {} as any;

