import {toAdvertisementName} from "@/utils/toAdvertisementName";

describe('toAdvertisementName', () => {
    beforeEach(() => {
    });

    it.each`
    url | expectedName
    ${'https://localhost:9999/some-path#CreditEnterpriseAdShape'} | ${'Business Loan'}
    ${'https://localhost:9999/some-path#CreditConsumerAdShape'} | ${'Private Loan'}
    ${'https://localhost:9999/some-path#and-unknown-hash-value'} | ${'https://localhost:9999/some-path#and-unknown-hash-value'}
    `('should extract $expectedName from url=$url', ({ url, expectedName }) => {
        expect.hasAssertions();

        // Act
        const result = toAdvertisementName(url);

        // Assert
        expect(result).toEqual(expectedName);
    });
});
