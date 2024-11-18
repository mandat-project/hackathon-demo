global.TextEncoder =  class {} as any;
global.TextDecoder =  class {} as any;
global.Notification =  class {} as any;
(global.navigator as any).serviceWorker =  { addEventListener: jest.fn() } as any;

import onResult from "@/router/accessRequestHandledCallback";
import { useCache } from "@shared/composables";

describe('accessRequestHandledCallback', () => {
  it('should memorize callback uri', async () => {
    const appMemory = useCache();
    const accessRequestUri = 'http://localhost:9999/url';

    expect(appMemory[accessRequestUri]).toBeUndefined();

    await onResult(accessRequestUri, '1');

    expect(appMemory[accessRequestUri]).toEqual('1');
  })
});
