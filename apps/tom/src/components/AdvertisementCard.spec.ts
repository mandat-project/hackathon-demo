import { mount } from '@vue/test-utils';
import AdvertisementCard from "./AdvertisementCard.vue";

describe('AdvertisementCard', () => {
    it('should render AdvertisementCard', async () => {
        const wrapper = mount(AdvertisementCard, { props: { ad: 'https://some-url.com'}});
        expect(wrapper.exists()).toBe(true);
    })
});
