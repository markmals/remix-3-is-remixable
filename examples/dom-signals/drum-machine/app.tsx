import { connect, type Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Drummer } from "./signal-drummer.ts";
import { tempoTap } from "../../shared/tempo-event.ts";
import { arrowDown, arrowUp, space } from "@remix-run/events/key";
import { press } from "@remix-run/events/press";
import {
    Button,
    ControlGroup,
    createEnvelopeLoop,
    EqualizerBar,
    Layout,
    TempoButton,
} from "./components.tsx";
import { component } from "../signal-component.tsx";

export function DrumMachine(this: Remix.Handle<Drummer>) {
    let drummer = new Drummer(80);

    events(document, [
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

    this.context.set(drummer);

    return () => (
        <Layout>
            <Equalizer />
            <DrumControls />
        </Layout>
    );
}

function Equalizer(this: Remix.Handle) {
    let drummer = this.context.get(DrumMachine);

    let kickVolumes = [0.4, 0.8, 0.3, 0.1];
    let snareVolumes = [0.4, 1, 0.7];
    let hatVolumes = [0.1, 0.8];

    let { createEnvelope } = createEnvelopeLoop(() => this.update());

    let kickEnv = createEnvelope(220);
    let snareEnv = createEnvelope(280);
    let hatEnv = createEnvelope(120);

    events(drummer, [
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
        let kicks = kickVolumes.map(volume => kickEnv.value * volume);
        let snares = snareVolumes.map(volume => snareEnv.value * volume);
        let hats = hatVolumes.map(volume => hatEnv.value * volume);

        return (
            <div
                css={{
                    display: "flex",
                    background: "black",
                    borderRadius: "12px",
                    padding: "12px",
                    width: "100%",
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
    };
}

const DrumControls = component(function (this: Remix.Handle) {
    let drummer = this.context.get(DrumMachine);
    let stop: HTMLButtonElement;
    let play: HTMLButtonElement;

    return () => {
        let isPlaying = drummer.isPlaying;

        return (
            <ControlGroup
                css={{
                    "& button:focus-visible": {
                        outline: "2px solid #2684FF",
                        outlineOffset: "2px",
                    },
                }}
            >
                <Button
                    on={[
                        tempoTap(event => {
                            drummer.play(event.detail);
                        }),
                    ]}
                >
                    SET TEMPO
                </Button>
                <TempoDisplay />
                <Button
                    disabled={isPlaying}
                    on={[
                        connect(event => (play = event.currentTarget)),
                        press(() => {
                            drummer.play();
                            this.queueTask(() => {
                                stop.focus();
                            });
                        }),
                    ]}
                >
                    PLAY
                </Button>
                <Button
                    disabled={!isPlaying}
                    on={[
                        connect(event => (stop = event.currentTarget)),
                        press(() => {
                            drummer.stop();
                            this.queueTask(() => {
                                play.focus();
                            });
                        }),
                    ]}
                >
                    STOP
                </Button>
            </ControlGroup>
        );
    };
});

const TempoDisplay = component(function (this: Remix.Handle) {
    let drummer = this.context.get(DrumMachine);
    return () => {
        let bpm = drummer.bpm;

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
                        on={press(() => {
                            drummer.setTempo(bpm + 1);
                        })}
                    />
                    <TempoButton
                        css={{ borderTopRightRadius: "0", borderBottomRightRadius: "12px" }}
                        orientation="down"
                        on={press(() => {
                            drummer.setTempo(bpm - 1);
                        })}
                    />
                </div>
            </div>
        );
    };
});
