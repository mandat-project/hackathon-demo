import {toAdvertisementImage} from "@/utils/toAdvertisementImage";

describe('toAdvertisementImage', () => {

    beforeEach(() => {
        jest.mock('../assets/business-loan-logo.svg', () => 'ASSETS/business-loan-logo.svg');
        jest.mock('../assets/private-loan-logo.svg', () => 'ASSETS/private-loan-logo.svg');
        jest.mock('../assets/logo.svg', () => 'ASSETS/logo.svg');
    });

    it.each`
    url | expectedName
    ${'https://localhost:9999/some-path#CreditEnterpriseAdShape'} | ${'ASSETS/business-loan-logo.svg'}
    ${'https://localhost:9999/some-path#CreditConsumerAdShape'} | ${'ASSETS/private-loan-logo.svg'}
    ${'https://localhost:9999/some-path#and-unknown-hash-value'} | ${'ASSETS/logo.svg'}
    `('should logo $expectedName from url=$url', ({ url, expectedName }) => {
        expect.hasAssertions();

        // Act
        const result = toAdvertisementImage(url);

        // Assert
        expect(result).toEqual(expectedName);
    });
});
