import { useCache } from "@shared/composables";
import onResult from "@/router/accessRequestHandledCallback";

describe('accessRequestHandledCallback', () => {
  it('should memorize callback uri', async () => {
    const cache = useCache();
    const accessRequestUri = 'http://localhost:9999/url';

    expect(cache[accessRequestUri]).toBeUndefined();

    await onResult(accessRequestUri, '1');

    expect(cache[accessRequestUri]).toEqual('1');
  })
});
