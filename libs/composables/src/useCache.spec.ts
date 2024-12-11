import {useCache} from "./useCache";

describe('useCache', () => {
    it('should be defined', () => {
        expect(useCache()).toBeDefined();
    });

    it('should return an object', () => {
        expect(typeof useCache() === 'object').toBe(true);
    });

    it('should cache values', () => {
        const cache = useCache();

        cache['jestTest'] = 'some-value;';

        expect(cache['jestTest']).toEqual('some-value;');
    });
});
