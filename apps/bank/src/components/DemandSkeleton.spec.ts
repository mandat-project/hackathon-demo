import {mount} from '@vue/test-utils';
import DemandSkeleton from "@/components/DemandSkeleton.vue";

describe('DemandSkeleton.vue', () => {
    it('should render DemandSkeleton', async () => {
        const wrapper = mount(DemandSkeleton,{
            global: {
                stubs: {
                    Skeleton: true
                }
            }
        });
        expect(wrapper.exists()).toBe(true);
    });
});