import {mount} from "@vue/test-utils";

// TODO: somehow I can not directly import Vue Components :/
const TabItem = require("./TabItem.vue").default;

describe('TabItem', () => {
  it('should render correctly when not active', () => {
    const result = mount(TabItem, {
      props: {
        item: { label: 'Test', id: 'test-id' },
        active: false,
      }
    });

    expect(result.exists()).toBe(true);
    expect(result.props()).toEqual({
      item: { label: 'Test', id: 'test-id' },
      active: false,
    });
    expect(result.text()).toEqual('Test');
    expect(result.find('.tab').exists()).toBe(true);
    expect(result.findComponent('.tab').exists()).toBe(true);
    expect(result.find('.tab .tab_content').exists()).toBe(true);
  });

  it('should render correctly when active', () => {
    const result = mount(TabItem, {
      props: {
        item: { label: 'Test', id: 'test-id' },
        active: true,
      }
    });

    expect(result.exists()).toBe(true);
    expect(result.props()).toEqual({
      item: { label: 'Test', id: 'test-id' },
      active: true,
    });
    expect(result.text()).toEqual('Test');
    expect(result.find('.tab.active').exists()).toBe(true);
    expect(result.findComponent('.tab.active').exists()).toBe(true);
    expect(result.find('.tab.active .tab_content').exists()).toBe(true);
  });
});
