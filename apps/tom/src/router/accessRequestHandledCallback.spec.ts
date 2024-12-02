import onResult from "@/router/accessRequestHandledCallback";

describe('accessRequestHandledCallback', () => {
  beforeEach(() => {

  });

  it('should be defined', () => {
    const cache: Record<string, string> = {'url': '2'};
    onResult('url', '1', cache);
    expect(cache['url']).toEqual('1');
  })
});
