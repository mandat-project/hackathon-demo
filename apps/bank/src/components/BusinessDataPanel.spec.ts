import {mount} from '@vue/test-utils';
import {Store, Writer} from 'n3';
import BusinessDataPanel from "@/components/BusinessDataPanel.vue";

jest.mock('@/assets/check.svg', () => 'mocked-check-icon-path');
jest.mock('highlight.js/styles/stackoverflow-light.css', () => 'mocked-check-icon-path');
jest.mock('highlight.js/lib/core', () => ({
    highlightBlock: jest.fn(),
    registerLanguage: jest.fn()
}));
describe('BusinessDataPanel.vue', () => {
    let store: Store;
    let writer: Writer;
    beforeAll(() => {
        store = new Store();
        writer = new Writer();
    });
    it('should render BusinessDataPanel', async () => {

        const wrapper = mount(BusinessDataPanel)
        expect(wrapper.exists()).toBe(true);
    });
});