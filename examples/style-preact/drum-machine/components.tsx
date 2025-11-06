/** @jsxImportSource preact */

import type { ComponentChildren, HTMLAttributes } from "preact";
import type { JSX } from "preact";
import { forwardRef, useEffect, useRef, useImperativeHandle } from "preact/compat";
import { events } from "@remix-run/events";
import type { EventDescriptor } from "@remix-run/events";
import type { EnhancedStyleProperties } from "@remix-run/style";
import { Logo } from "./logo.tsx";

interface LayoutProps {
    children: ComponentChildren;
}

export function Layout({ children }: LayoutProps) {
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
                width: "650px",
                margin: "0 auto",
                background: "#2D2D2D",
                color: "white",
                borderRadius: "36px",
                padding: "30px 32px 36px",
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
                    PREACT
                    <br />
                    DRUM MACHINE
                </div>
            </header>

            {children}
        </div>
    );
}

interface EqualizerBarProps {
    volume: number; // 0-1
}

export function EqualizerBar({ volume }: EqualizerBarProps) {
    const colors = [
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

    const startIndexToShow = 10 - Math.round(volume * 10);

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
                    key={index}
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
}

interface ControlGroupProps extends HTMLAttributes<HTMLDivElement> {
    css: EnhancedStyleProperties;
    children: ComponentChildren;
}

export function ControlGroup({ children, css, ...rest }: ControlGroupProps) {
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
                height: "200px",
                ...css,
            }}
        >
            {children}
        </div>
    );
}

interface ButtonProps {
    children: ComponentChildren;
    on?: EventDescriptor | EventDescriptor[];
    disabled?: boolean;
    css?: any;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { children, on: onEvents, disabled, css: cssProps, ...rest },
    forwardedRef,
) {
    const localRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(forwardedRef, () => localRef.current as HTMLButtonElement);

    useEffect(() => {
        if (!localRef.current || !onEvents) return;

        const cleanup = events(localRef.current, Array.isArray(onEvents) ? onEvents : [onEvents]);

        return () => {
            if (Array.isArray(cleanup)) {
                cleanup.forEach(fn => fn());
            } else {
                cleanup();
            }
        };
    }, [onEvents]);

    return (
        <button
            ref={localRef}
            disabled={disabled}
            css={{
                all: "unset",
                letterSpacing: "1.25px",
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
                ...cssProps,
            }}
        >
            {children}
        </button>
    );
});

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
            if (state && state.gen) {
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

interface TriangleProps {
    label: string;
    orientation: "up" | "down";
}

export function Triangle({ label, orientation }: TriangleProps) {
    const up = "5,1.34 9.33,8.66 0.67,8.66";
    const down = "5,8.66 9.33,1.34 0.67,1.34";
    return (
        <svg
            aria-label={label}
            viewBox="0 0 10 10"
            css={{
                width: "18px",
                height: "18px",
            }}
        >
            <polygon points={orientation === "up" ? up : down} fill="currentColor" />
        </svg>
    );
}

interface TempoButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, "on"> {
    orientation: "up" | "down";
    on?: EventDescriptor | EventDescriptor[];
}

export function TempoButton({ orientation, on: onEvents, css, ...rest }: TempoButtonProps) {
    const ref = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!ref.current || !onEvents) return;

        const cleanup = events(ref.current, Array.isArray(onEvents) ? onEvents : [onEvents]);

        return () => {
            if (Array.isArray(cleanup)) {
                cleanup.forEach(fn => fn());
            } else {
                cleanup();
            }
        };
    }, [onEvents]);

    return (
        <button
            {...rest}
            ref={ref}
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
