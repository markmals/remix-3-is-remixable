import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createContext, ContextProvider, ContextConsumer } from "@lit/context";
import { events } from "@remix-run/events";
import { arrowDown, arrowUp, space } from "@remix-run/events/key";
import { press } from "@remix-run/events/press";
import { Drummer } from "../../shared/event-drummer.ts";
import { tempoTap } from "../../shared/tempo-event.ts";
import "./components.ts";
import "./logo.ts";

// Create context for the Drummer instance
export const drummerContext = createContext<Drummer>("drummer");

@customElement("drum-machine")
export class DrumMachine extends LitElement {
    static override styles = css`
        :host {
            display: block;
        }
    `;

    drummer = new Drummer(80);
    private provider = new ContextProvider(this, {
        context: drummerContext,
        initialValue: this.drummer,
    });

    private cleanupKeyboard?: () => void | (() => void)[];

    override connectedCallback() {
        super.connectedCallback();

        // Set up keyboard event listeners
        this.cleanupKeyboard = events(document, [
            space(() => {
                this.drummer.toggle();
            }),
            arrowUp(() => {
                this.drummer.setTempo(this.drummer.bpm + 1);
            }),
            arrowDown(() => {
                this.drummer.setTempo(this.drummer.bpm - 1);
            }),
        ]);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        if (this.cleanupKeyboard) {
            if (Array.isArray(this.cleanupKeyboard)) {
                this.cleanupKeyboard.forEach(fn => fn());
            } else {
                this.cleanupKeyboard();
            }
        }
    }

    override render() {
        return html`
            <drum-layout>
                <drum-equalizer></drum-equalizer>
                <drum-controls></drum-controls>
            </drum-layout>
        `;
    }
}

@customElement("drum-equalizer")
export class Equalizer extends LitElement {
    static override styles = css`
        :host {
            display: block;
        }
        .container {
            display: flex;
            background: black;
            border-radius: 12px;
            padding: 12px;
            height: 230px;
            gap: 4px;
        }
    `;

    drummer!: Drummer;
    private _consumer = new ContextConsumer(this, {
        context: drummerContext,
        subscribe: true,
        callback: value => {
            this.drummer = value;
            this.requestUpdate();
        },
    });

    private kickVolumes = [0.4, 0.8, 0.3, 0.1];
    private snareVolumes = [0.4, 1, 0.7];
    private hatVolumes = [0.1, 0.8];

    private frameId: number | null = null;
    private kickEnv?: { value: number; trigger: (amplitude?: number) => void };
    private snareEnv?: { value: number; trigger: (amplitude?: number) => void };
    private hatEnv?: { value: number; trigger: (amplitude?: number) => void };

    private cleanupDrummer?: () => void | (() => void)[];

    override connectedCallback() {
        super.connectedCallback();

        // Create envelopes
        this.kickEnv = this.createEnvelope(220);
        this.snareEnv = this.createEnvelope(280);
        this.hatEnv = this.createEnvelope(120);

        // Set up drum event listeners
        this.cleanupDrummer = events(this.drummer, [
            Drummer.kick(() => {
                this.kickEnv?.trigger(1);
            }),
            Drummer.snare(() => {
                this.snareEnv?.trigger(1);
            }),
            Drummer.hat(() => {
                this.hatEnv?.trigger(1);
            }),
        ]);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        if (this.cleanupDrummer) {
            if (Array.isArray(this.cleanupDrummer)) {
                this.cleanupDrummer.forEach(fn => fn());
            } else {
                this.cleanupDrummer();
            }
        }
        if (this.frameId != null) {
            cancelAnimationFrame(this.frameId);
        }
    }

    private createExponentialDecayGenerator(
        halfLifeMs: number,
        startValue: number,
        startMs: number,
    ): Generator<number, number, number> {
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

    private ensureLoop() {
        if (this.frameId == null) {
            this.frameId = requestAnimationFrame(now => this.tick(now));
        }
    }

    private envelopeStates: Array<{
        value: number;
        halfLifeMs: number;
        gen: Generator<number, number, number> | null;
    }> = [];

    private tick(now: number) {
        let anyActive = false;
        const epsilon = 0.001;

        for (let i = 0; i < this.envelopeStates.length; i++) {
            const state = this.envelopeStates[i];
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
            this.requestUpdate();
            this.frameId = requestAnimationFrame(now => this.tick(now));
        } else {
            this.frameId = null;
        }
    }

    private createEnvelope(halfLifeMs: number) {
        const state: {
            value: number;
            halfLifeMs: number;
            gen: Generator<number, number, number> | null;
        } = { value: 0, halfLifeMs, gen: null };

        this.envelopeStates.push(state);

        return {
            get value() {
                return state.value;
            },
            trigger: (amplitude: number = 1) => {
                const now = performance.now();
                state.value = amplitude;
                state.gen = this.createExponentialDecayGenerator(halfLifeMs, amplitude, now);
                state.gen.next();
                this.ensureLoop();
            },
        };
    }

    override render() {
        const kicks = this.kickEnv
            ? this.kickVolumes.map(volume => this.kickEnv!.value * volume)
            : [0, 0, 0, 0];
        const snares = this.snareEnv
            ? this.snareVolumes.map(volume => this.snareEnv!.value * volume)
            : [0, 0, 0];
        const hats = this.hatEnv
            ? this.hatVolumes.map(volume => this.hatEnv!.value * volume)
            : [0, 0];

        return html`
            <div class="container">
                ${kicks.map(volume => html`<equalizer-bar .volume=${volume}></equalizer-bar>`)}
                ${snares.map(volume => html`<equalizer-bar .volume=${volume}></equalizer-bar>`)}
                ${hats.map(volume => html`<equalizer-bar .volume=${volume}></equalizer-bar>`)}
            </div>
        `;
    }
}

@customElement("drum-controls")
export class DrumControls extends LitElement {
    static override styles = css`
        :host {
            display: block;
        }
        button:focus-visible {
            outline: 2px solid #2684ff;
            outline-offset: 2px;
        }
    `;

    drummer!: Drummer;
    private _consumer = new ContextConsumer(this, {
        context: drummerContext,
        subscribe: true,
        callback: value => {
            this.drummer = value;
            this.requestUpdate();
        },
    });

    @state()
    private isPlaying = false;

    private playButton?: HTMLButtonElement;
    private stopButton?: HTMLButtonElement;
    private cleanupDrummer?: () => void | (() => void)[];

    override connectedCallback() {
        super.connectedCallback();
        this.cleanupDrummer = events(this.drummer, [
            Drummer.change(() => {
                this.isPlaying = this.drummer.isPlaying;
                this.requestUpdate();
            }),
        ]);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        if (this.cleanupDrummer) {
            if (Array.isArray(this.cleanupDrummer)) {
                this.cleanupDrummer.forEach(fn => fn());
            } else {
                this.cleanupDrummer();
            }
        }
    }

    override render() {
        return html`
            <control-group>
                <drum-button
                    .events=${tempoTap(event => {
                        this.drummer.play(event.detail);
                    })}
                >
                    SET TEMPO
                </drum-button>
                <tempo-display></tempo-display>
                <drum-button
                    .disabled=${this.isPlaying}
                    .events=${press(() => {
                        this.drummer.play();
                        setTimeout(() => {
                            this.stopButton?.focus();
                        });
                    })}
                >
                    PLAY
                </drum-button>
                <drum-button
                    .disabled=${!this.isPlaying}
                    .events=${press(() => {
                        this.drummer.stop();
                        setTimeout(() => {
                            this.playButton?.focus();
                        });
                    })}
                >
                    STOP
                </drum-button>
            </control-group>
        `;
    }
}

@customElement("tempo-display")
export class TempoDisplay extends LitElement {
    static override styles = css`
        :host {
            display: block;
            height: 100%;
        }
        .container {
            display: flex;
            flex-direction: row;
            gap: clamp(6px, 1vw, 10px);
            align-items: stretch;
            height: 100%;
        }
        .bpm-display {
            height: 100%;
            display: flex;
            flex: 1;
            background: #0b1b05;
            color: #64c146;
            padding: clamp(20px, 3vw, 42px);
            border-top-left-radius: clamp(12px, 2vw, 24px);
            border-bottom-left-radius: clamp(12px, 2vw, 24px);
            align-items: end;
            box-sizing: border-box;
        }
        .bpm-label {
            font-size: clamp(16px, 2vw, 24px);
            font-weight: 700;
            width: 33%;
        }
        .bpm-value {
            flex: 1;
            font-size: clamp(48px, 7vw, 92px);
            font-weight: 700;
            position: relative;
            top: clamp(10px, 2vw, 22px);
            text-align: right;
            font-family: "JetBrains Mono", monospace;
        }
        .buttons {
            width: clamp(40px, 6vw, 75px);
            display: flex;
            flex-direction: column;
            gap: clamp(6px, 1vw, 12px);
            justify-content: space-between;
        }
        tempo-button {
            flex: 1;
        }
    `;

    drummer!: Drummer;
    private _consumer = new ContextConsumer(this, {
        context: drummerContext,
        subscribe: true,
        callback: value => {
            this.drummer = value;
            this.requestUpdate();
        },
    });

    @state()
    private bpm = 90;

    private cleanupDrummer?: () => void | (() => void)[];

    override connectedCallback() {
        super.connectedCallback();
        this.bpm = this.drummer.bpm;
        this.cleanupDrummer = events(this.drummer, [
            Drummer.change(() => {
                this.bpm = this.drummer.bpm;
                this.requestUpdate();
            }),
        ]);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        if (this.cleanupDrummer) {
            if (Array.isArray(this.cleanupDrummer)) {
                this.cleanupDrummer.forEach(fn => fn());
            } else {
                this.cleanupDrummer();
            }
        }
    }

    override render() {
        return html`
            <div class="container">
                <div class="bpm-display">
                    <div class="bpm-label">BPM</div>
                    <div class="bpm-value">${this.bpm}</div>
                </div>
                <div class="buttons">
                    <tempo-button
                        style="border-top-right-radius: 24px; overflow: hidden;"
                        orientation="up"
                        .events=${press(() => {
                            this.drummer.setTempo(this.bpm + 1);
                        })}
                    ></tempo-button>
                    <tempo-button
                        style="border-bottom-right-radius: 24px; overflow: hidden;"
                        orientation="down"
                        .events=${press(() => {
                            this.drummer.setTempo(this.bpm - 1);
                        })}
                    ></tempo-button>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "drum-machine": DrumMachine;
        "drum-equalizer": Equalizer;
        "drum-controls": DrumControls;
        "tempo-display": TempoDisplay;
    }
}
