import type { Remix } from "@remix-run/dom";
import { dom, events } from "@remix-run/events";
import { Signal } from "signal-polyfill";

type RemixComponent<Context, SetupProps, RenderProps> = (
    this: Remix.Handle<Context>,
    props: SetupProps,
) => (props: RenderProps) => Remix.RemixNode;

export function component<Context, SetupProps, RenderProps>(
    setup: RemixComponent<Context, SetupProps, RenderProps>,
) {
    return function (this: Remix.Handle<Context>, setupProps: SetupProps) {
        let dispose: (() => void) | undefined;
        let w = new Signal.subtle.Watcher(() => {
            this.update();
        });

        events(this.signal, [dom.abort(() => dispose?.())]);

        const render = setup.call(this, setupProps);

        return (props: RenderProps) => {
            dispose?.();
            if (this.signal.aborted) {
                return;
            }
            let template = new Signal.Computed(() => render(props));
            w.watch(template);
            dispose = () => w.unwatch(template);
            return template.get();
        };
    };
}
