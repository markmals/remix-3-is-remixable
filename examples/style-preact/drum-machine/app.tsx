/** @jsxImportSource preact */

import { createContext, useEffect, useMemo, useRef, useState } from "preact/compat";
import { events } from "@remix-run/events";
import { arrowDown, arrowUp, space } from "@remix-run/events/key";
import { press } from "@remix-run/events/press";
import { Drummer } from "../../shared/event-drummer.ts";
import { tempoTap } from "../../shared/tempo-event.ts";
import {
    Button,
    ControlGroup,
    createEnvelopeLoop,
    EqualizerBar,
    Layout,
    TempoButton,
} from "./components.tsx";

const DrummerContext = createContext<Drummer | null>(null);

export function DrumMachine() {
    const drummer = useMemo(() => new Drummer(80), []);

    useEffect(() => {
        const cleanup = events(document, [
            space(() => {
                drummer.toggle();
            }),
            arrowUp(() => {
                drummer.setTempo(drummer.bpm + 1);
            }),
            arrowDown(() => {
                drummer.setTempo(drummer.bpm - 1);
            }),
        ]);

        return () => {
            if (Array.isArray(cleanup)) {
                cleanup.forEach(fn => fn());
            } else {
                cleanup();
            }
        };
    }, [drummer]);

    return (
        <Layout>
            <Equalizer drummer={drummer} />
            <DrumControls drummer={drummer} />
        </Layout>
    );
}

function Equalizer({ drummer }: { drummer: Drummer }) {
    const [, setTick] = useState(0);

    const kickVolumes = [0.4, 0.8, 0.3, 0.1];
    const snareVolumes = [0.4, 1, 0.7];
    const hatVolumes = [0.1, 0.8];

    const { createEnvelope } = useMemo(() => createEnvelopeLoop(() => setTick(t => t + 1)), []);

    const kickEnv = useMemo(() => createEnvelope(220), [createEnvelope]);
    const snareEnv = useMemo(() => createEnvelope(280), [createEnvelope]);
    const hatEnv = useMemo(() => createEnvelope(120), [createEnvelope]);

    useEffect(() => {
        const cleanup = events(drummer, [
            Drummer.kick(() => {
                kickEnv.trigger(1);
            }),
            Drummer.snare(() => {
                snareEnv.trigger(1);
            }),
            Drummer.hat(() => {
                hatEnv.trigger(1);
            }),
        ]);

        return () => {
            if (Array.isArray(cleanup)) {
                cleanup.forEach(fn => fn());
            } else {
                cleanup();
            }
        };
    }, [drummer, kickEnv, snareEnv, hatEnv]);

    const kicks = kickVolumes.map(volume => kickEnv.value * volume);
    const snares = snareVolumes.map(volume => snareEnv.value * volume);
    const hats = hatVolumes.map(volume => hatEnv.value * volume);

    return (
        <div
            css={{
                display: "flex",
                background: "black",
                borderRadius: "12px",
                padding: "12px",
                height: "300px",
                gap: "4px",
            }}
        >
            {/* kick */}
            <EqualizerBar volume={kicks[0] ?? 0} />
            <EqualizerBar volume={kicks[1] ?? 0} />
            <EqualizerBar volume={kicks[2] ?? 0} />
            <EqualizerBar volume={kicks[3] ?? 0} />

            {/* snare */}
            <EqualizerBar volume={snares[0] ?? 0} />
            <EqualizerBar volume={snares[1] ?? 0} />
            <EqualizerBar volume={snares[2] ?? 0} />

            {/* hat */}
            <EqualizerBar volume={hats[0] ?? 0} />
            <EqualizerBar volume={hats[1] ?? 0} />
        </div>
    );
}

function DrumControls({ drummer }: { drummer: Drummer }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const stopRef = useRef<HTMLButtonElement>(null);
    const playRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setIsPlaying(drummer.isPlaying);

        const cleanup = events(drummer, [
            Drummer.change(() => {
                setIsPlaying(drummer.isPlaying);
            }),
        ]);

        return () => {
            if (Array.isArray(cleanup)) {
                cleanup.forEach(fn => fn());
            } else {
                cleanup();
            }
        };
    }, [drummer]);

    const tempoTapHandler = useMemo(
        () =>
            tempoTap(event => {
                drummer.play(event.detail);
            }),
        [drummer],
    );

    const playHandler = useMemo(
        () =>
            press(() => {
                drummer.play();
                setTimeout(() => {
                    stopRef.current?.focus();
                });
            }),
        [drummer],
    );

    const stopHandler = useMemo(
        () =>
            press(() => {
                drummer.stop();
                setTimeout(() => {
                    playRef.current?.focus();
                });
            }),
        [drummer],
    );

    return (
        <ControlGroup
            css={{
                "& button:focus-visible": {
                    outline: "2px solid #2684FF",
                    outlineOffset: "2px",
                },
            }}
        >
            <Button on={[tempoTapHandler]}>SET TEMPO</Button>
            <TempoDisplay drummer={drummer} />
            <Button ref={playRef} disabled={isPlaying} on={[playHandler]}>
                PLAY
            </Button>
            <Button ref={stopRef} disabled={!isPlaying} on={[stopHandler]}>
                STOP
            </Button>
        </ControlGroup>
    );
}

function TempoDisplay({ drummer }: { drummer: Drummer }) {
    const [bpm, setBpm] = useState(drummer.bpm);

    useEffect(() => {
        setBpm(drummer.bpm);

        const cleanup = events(drummer, [
            Drummer.change(() => {
                setBpm(drummer.bpm);
            }),
        ]);

        return () => {
            if (Array.isArray(cleanup)) {
                cleanup.forEach(fn => fn());
            } else {
                cleanup();
            }
        };
    }, [drummer]);

    const upHandler = useMemo(
        () =>
            press(() => {
                drummer.setTempo(bpm + 1);
            }),
        [drummer, bpm],
    );

    const downHandler = useMemo(
        () =>
            press(() => {
                drummer.setTempo(bpm - 1);
            }),
        [drummer, bpm],
    );

    return (
        <div
            css={{
                display: "flex",
                gap: "10px",
                alignItems: "stretch",
            }}
        >
            <div
                css={{
                    display: "flex",
                    flex: 1,
                    background: "#0B1B05",
                    color: "#64C146",
                    padding: "18px",
                    borderTopLeftRadius: "12px",
                    borderBottomLeftRadius: "12px",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    boxSizing: "border-box",
                }}
            >
                <div
                    css={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                    }}
                >
                    BPM
                </div>
                <div
                    css={{
                        flex: 1,
                        fontSize: "2.6rem",
                        fontWeight: 700,
                        textAlign: "right",
                        fontFamily: "JetBrains Mono, monospace",
                        lineHeight: 1,
                    }}
                >
                    {bpm}
                </div>
            </div>
            <div
                css={{
                    width: "56px",
                    display: "grid",
                    gridTemplateRows: "1fr 1fr",
                    gap: "10px",
                }}
            >
                <TempoButton
                    css={{ borderTopRightRadius: "12px", borderBottomRightRadius: "0" }}
                    orientation="up"
                    on={upHandler}
                />
                <TempoButton
                    css={{ borderTopRightRadius: "0", borderBottomRightRadius: "12px" }}
                    orientation="down"
                    on={downHandler}
                />
            </div>
        </div>
    );
}
