import { createRoot } from "@remix-run/dom";
import type { Remix } from "@remix-run/dom";
import { press } from "@remix-run/events/press";
import { Signal } from "signal-polyfill";
import { component } from "./signal-component";
import { DrumMachine } from "./drum-machine/app";

const App = component(function (this: Remix.Handle) {
    let count = new Signal.State(1);
    let double = new Signal.Computed(() => count.get() * 2);
    let increment = press(() => count.set(count.get() + 1));

    return () => (
        <>
            <span>
                Double {count.get()} is {double.get()}
            </span>
            <button on={increment}>Increment</button>
        </>
    );
});

createRoot(document.body).render(<DrumMachine />);
