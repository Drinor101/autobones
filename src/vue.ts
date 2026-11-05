import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type Directive, type PropType } from "vue";
import { createSkeleton, type SkeletonController, type SkeletonOptions } from "./core";

const optionKeys = ["baseColor", "highlightColor", "animation", "duration", "textRadius", "textHeightRatio", "observe", "boneSelector", "injectStyles", "name", "persist", "delay", "minDuration", "fade"] as const;

/** <Skeleton :loading="isLoading"> <UserCard :user="user ?? placeholder" /> </Skeleton> */
export const Skeleton = defineComponent({
  name: "Skeleton",
  props: {
    loading: { type: Boolean, required: true },
    as: { type: String, default: "div" },
    baseColor: String,
    highlightColor: String,
    animation: String as PropType<SkeletonOptions["animation"]>,
    duration: Number,
    textRadius: String,
    textHeightRatio: Number,
    observe: { type: Boolean, default: undefined },
    boneSelector: String,
    injectStyles: { type: Boolean, default: undefined },
    name: String,
    persist: { type: Boolean, default: undefined },
    delay: Number,
    minDuration: Number,
    fade: Number,
  },
  setup(props, { slots }) {
    const el = ref<HTMLElement | null>(null);
    let ctrl: SkeletonController | null = null;
    const options = (): SkeletonOptions => Object.fromEntries(optionKeys.map((k) => [k, props[k]]));

    onMounted(() => {
      ctrl = createSkeleton(el.value!, options(), props.loading);
    });
    watch(() => props.loading, (v) => ctrl?.setLoading(v), { flush: "post" });
    watch(options, (o) => ctrl?.setOptions(o), { deep: true, flush: "post" });
    onBeforeUnmount(() => ctrl?.destroy());

    return () => h(props.as, { ref: el }, slots.default?.());
  },
});

/** Directive: <div v-skeleton="isLoading"> or v-skeleton="{ loading, animation: 'pulse' }" */
type DirValue = boolean | (SkeletonOptions & { loading: boolean });
const store = new WeakMap<HTMLElement, SkeletonController>();
const parse = (v: DirValue) => (typeof v === "boolean" ? { loading: v, options: {} } : (({ loading, ...options }) => ({ loading, options }))(v));

export const vSkeleton: Directive<HTMLElement, DirValue> = {
  mounted(el, { value }) {
    const { loading, options } = parse(value);
    store.set(el, createSkeleton(el, options, loading));
  },
  updated(el, { value }) {
    const { loading, options } = parse(value);
    const c = store.get(el);
    c?.setOptions(options);
    c?.setLoading(loading);
  },
  beforeUnmount(el) {
    store.get(el)?.destroy();
    store.delete(el);
  },
};

export { clearLayouts, registerLayouts, exportLayouts } from "./core";
export type { SkeletonOptions, LayoutsFile } from "./core";
