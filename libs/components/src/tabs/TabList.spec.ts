import { mount } from '@vue/test-utils';
import { TabItemType } from './TabItemType';
// TODO: somehow I can not directly import Vue Components :/
const TabItem = require("./TabItem.vue").default;
const TabList = require("./TabList.vue").default;

describe('TabList', () => {
  const mockModel: TabItemType[] = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
  ];

  it('renders all tab items', async () => {
    const wrapper = mount(TabList, {
      props: { model: mockModel },
    });

    expect(wrapper.findAllComponents(TabItem)).toHaveLength(mockModel.length);
  });

  it('emits itemChange event when a tab item is clicked', async () => {
    const wrapper = mount(TabList, {
      props: { model: mockModel },
    });

    const tabItem = wrapper.findAllComponents(TabItem)[0];
    await tabItem?.trigger('click');

    expect(wrapper.emitted('itemChange')).toHaveLength(1);
    expect(wrapper.emitted('itemChange')![0][0]).toBe(mockModel[0].id);
  });

  it('sets active tab item when active prop is changed', async () => {
    const wrapper = mount(TabList, {
      props: { model: mockModel, active: mockModel[0].id },
    });

    expect(wrapper.vm.active).toBe(mockModel[0].id);

    await wrapper.setProps({ active: mockModel[1].id });
    expect(wrapper.vm.active).toBe(mockModel[1].id);
  });

  it('renders active tab item correctly', async () => {
    const wrapper = mount(TabList, {
      props: { model: mockModel, active: mockModel[0].id },
    });

    const tabItem = wrapper.findAllComponents(TabItem)[0];
    expect(tabItem?.props().active).toBe(true);

    const inactiveTabItem = wrapper.findAllComponents(TabItem)[1];
    expect(inactiveTabItem?.props().active).toBe(false);
  });
});
