import type { Remix } from "@remix-run/dom";
import { Logo } from "./logo";

export function Layout({ children }: { children: Remix.RemixNode }) {
    return (
        <div
            css={{
                boxSizing: "border-box",
                "& *": {
                    boxSizing: "border-box",
                },
                display: "flex",
                flexDirection: "column",
                gap: "30px",
                width: "min(420px, calc(100vw - 40px))",
                margin: "0 auto",
                background: "#2D2D2D",
                color: "white",
                borderRadius: "36px",
                padding: "30px 32px 36px 32px",
            }}
        >
            <header
                css={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                }}
            >
                <Logo />
                <div
                    css={{
                        display: "flex",
                        alignItems: "end",
                        lineHeight: "0.88",
                        textAlign: "right",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        position: "relative",
                        top: "1px",
                    }}
                >
                    REMIX 3<br />
                    DRUM MACHINE
                </div>
            </header>

            {children}
        </div>
    );
}

export function EqualizerBar(this: Remix.Handle) {
    let colors = [
        "#FF3000",
        "#FF3000",
        "#E561C3",
        "#E561C3",
        "#FFD400",
        "#FFD400",
        "#64C146",
        "#64C146",
        "#1A72FF",
        "#1A72FF",
    ];

    return ({ volume }: { volume: number /* 0-1 */ }) => {
        let startIndexToShow = 10 - Math.round(volume * 10);
        return (
            <div
                css={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}
            >
                {Array.from({ length: 10 }).map((_, index) => (
                    <div
                        css={{
                            flex: 1,
                            width: "100%",
                            borderRadius: "4px",
                            background: colors[index],
                            opacity: index >= startIndexToShow ? 1 : 0.25,
                        }}
                    />
                ))}
            </div>
        );
    };
}

export function ControlGroup({ children, css, ...rest }: Remix.Props<"div">) {
    return (
        <div
            {...rest}
            css={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gridAutoRows: "minmax(64px, auto)",
                gap: "12px",
                alignItems: "stretch",
                justifyContent: "center",
                ...css,
            }}
        >
            {children}
        </div>
    );
}

export function Button({ children, ...rest }: Remix.Props<"button">) {
    return (
        <button
            {...rest}
            css={{
                all: "unset",
                letterSpacing: 1.25,
                height: "100%",
                display: "flex",
                alignItems: "flex-end",
                background: "#666",
                borderRadius: "12px",
                padding: "16px 20px",
                fontSize: "0.75rem",
                fontWeight: 700,
                boxSizing: "border-box",
                "&:disabled": {
                    opacity: 0.25,
                },
                "&:active": {
                    background: "#555",
                },
            }}
        >
            {children}
        </button>
    );
}

export type DecayGenerator = Generator<number, number, number>;

export function createExponentialDecayGenerator(
    halfLifeMs: number,
    startValue: number,
    startMs: number,
): DecayGenerator {
    const localEpsilon = 0.001;
    function* decay(): Generator<number, number, number> {
        let value = startValue;
        let lastMs = startMs;
        while (value > localEpsilon) {
            const input = yield value;
            const nowMs = typeof input === "number" ? input : performance.now();
            const deltaMs = Math.max(0, nowMs - lastMs);
            lastMs = nowMs;
            const decayFactor = Math.pow(0.5, deltaMs / halfLifeMs);
            value = value * decayFactor;
        }
        return 0;
    }
    return decay();
}

export function createEnvelopeLoop(render: () => void, epsilon: number = 0.001) {
    let frameId: number | null = null;

    type EnvelopeState = {
        value: number;
        halfLifeMs: number;
        gen: DecayGenerator | null;
    };

    let envelopes: EnvelopeState[] = [];

    function ensureLoop() {
        if (frameId == null) frameId = requestAnimationFrame(tick);
    }

    function tick(now: number) {
        let anyActive = false;
        for (let i = 0; i < envelopes.length; i++) {
            const state = envelopes[i];
            if (state?.gen) {
                const result = state.gen.next(now);
                state.value = result.value ?? 0;
                if (result.done) {
                    state.gen = null;
                    state.value = 0;
                } else if (state.value > epsilon) {
                    anyActive = true;
                }
            }
        }
        if (anyActive) {
            render();
            frameId = requestAnimationFrame(tick);
        } else {
            frameId = null;
        }
    }

    function createEnvelope(halfLifeMs: number) {
        const state: EnvelopeState = { value: 0, halfLifeMs, gen: null };
        envelopes.push(state);
        return {
            get value() {
                return state.value;
            },
            trigger(amplitude: number = 1) {
                const now = performance.now();
                state.value = amplitude;
                state.gen = createExponentialDecayGenerator(state.halfLifeMs, amplitude, now);
                void state.gen.next();
                ensureLoop();
            },
        };
    }

    return { createEnvelope };
}

export function Triangle({ label, orientation }: { label: string; orientation: "up" | "down" }) {
    let up = "5,1.34 9.33,8.66 0.67,8.66";
    let down = "5,8.66 9.33,1.34 0.67,1.34";
    return (
        <svg
            aria-label={label}
            viewBox="0 0 10 10"
            css={{
                width: 18,
                height: 18,
            }}
        >
            <polygon points={orientation === "up" ? up : down} fill="currentColor" />
        </svg>
    );
}

interface TempoButtonProps extends Remix.Props<"button"> {
    orientation: "up" | "down";
}

export function TempoButton({ orientation, css, ...rest }: TempoButtonProps) {
    return (
        <button
            {...rest}
            css={{
                all: "unset",
                flex: 1,
                width: "100%",
                minHeight: 0,
                background: "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0",
                padding: "10px 0",
                "&:active": {
                    background: "#555",
                },
                ...css,
            }}
        >
            <Triangle label={orientation} orientation={orientation} />
        </button>
    );
}
