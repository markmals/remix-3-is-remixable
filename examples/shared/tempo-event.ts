import { createInteraction, events } from "@remix-run/events";
import { press } from "@remix-run/events/press";

export let tempoTap = createInteraction<HTMLElement, number>(
    "tempo-tap",
    ({ target, dispatch }) => {
        let taps: number[] = [];
        let minTaps = 4;
        let maxInterval = 2000; // Reset if gap too long
        let resetTimer: number;

        let handleTap = () => {
            let now = Date.now();
            clearTimeout(resetTimer);
            taps.push(now);
            taps = taps.filter(tap => now - tap < maxInterval);
            if (taps.length >= minTaps) {
                let intervals = [];
                for (let i = 1; i < taps.length; i++) {
                    intervals.push(taps[i]! - taps[i - 1]!);
                }
                let bpms = intervals.map(interval => 60000 / interval);
                let avgBpm = Math.round(bpms.reduce((sum, value) => sum + value, 0) / bpms.length);
                dispatch({ detail: avgBpm });
            }

            resetTimer = window.setTimeout(() => {
                taps = [];
            }, maxInterval);
        };

        return events(target, [press(handleTap)]);
    },
);
