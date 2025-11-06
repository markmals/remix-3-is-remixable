import { LitElement, html, css, svg } from "lit";
import { customElement, property } from "lit/decorators.js";
import { on } from "../on-directive.ts";
import type { EventDescriptor } from "@remix-run/events";

@customElement("drum-layout")
export class Layout extends LitElement {
    static override styles = css`
        :host {
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 20px;
            width: 100%;
            max-width: 360px;
            margin: 0 auto;
            background: #2d2d2d;
            color: white;
            border-radius: 28px;
            padding: 24px 20px 28px 20px;
        }
        * {
            box-sizing: border-box;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }
        .title {
            display: flex;
            align-items: end;
            line-height: 0.88;
            text-align: right;
            font-size: 1.4rem;
            font-weight: 700;
            position: relative;
            top: 1px;
        }
    `;

    override render() {
        return html`
            <header>
                <drum-logo></drum-logo>
                <div class="title">
                    LIT<br />
                    DRUM MACHINE
                </div>
            </header>
            <slot></slot>
        `;
    }
}

@customElement("equalizer-bar")
export class EqualizerBar extends LitElement {
    static override styles = css`
        :host {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .bar {
            flex: 1;
            width: 100%;
            border-radius: 4px;
        }
    `;

    @property({ type: Number })
    volume = 0;

    private colors = [
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

    override render() {
        const startIndexToShow = 10 - Math.round(this.volume * 10);

        return html`
            ${Array.from({ length: 10 }).map((_, index) => {
                return html`
                    <div
                        class="bar"
                        style="background: ${this.colors[index]}; opacity: ${index >=
                        startIndexToShow
                            ? 1
                            : 0.25}"
                    ></div>
                `;
            })}
        `;
    }
}

@customElement("control-group")
export class ControlGroup extends LitElement {
    static override styles = css`
        :host {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 80px 80px;
            gap: 12px;
            align-items: stretch;
            justify-content: center;
        }
    `;

    override render() {
        return html`<slot></slot>`;
    }
}

@customElement("drum-button")
export class Button extends LitElement {
    static override styles = css`
        :host {
            display: block;
            height: 100%;
        }
        button {
            all: unset;
            letter-spacing: 1.25px;
            height: 100%;
            width: 100%;
            display: flex;
            align-items: end;
            background: #666;
            border-radius: 12px;
            padding: 20px;
            font-size: 12px;
            font-weight: 700;
            box-sizing: border-box;
        }
        button:disabled {
            opacity: 0.25;
        }
        button:active:not(:disabled) {
            background: #555;
        }
    `;

    @property({ type: Boolean })
    disabled = false;

    @property({ attribute: false })
    events: EventDescriptor | EventDescriptor[] | null | undefined = null;

    override render() {
        return html`
            <button ${on(this.events)} ?disabled=${this.disabled}>
                <slot></slot>
            </button>
        `;
    }
}

@customElement("triangle-icon")
export class Triangle extends LitElement {
    static override styles = css`
        svg {
            width: 18px;
            height: 18px;
        }
    `;

    @property({ type: String })
    orientation: "up" | "down" = "up";

    @property({ type: String })
    label = "";

    override render() {
        const up = "5,1.34 9.33,8.66 0.67,8.66";
        const down = "5,8.66 9.33,1.34 0.67,1.34";
        const points = this.orientation === "up" ? up : down;

        return svg`
      <svg aria-label=${this.label} viewBox="0 0 10 10">
        <polygon points=${points} fill="currentColor" />
      </svg>
    `;
    }
}

@customElement("tempo-button")
export class TempoButton extends LitElement {
    static override styles = css`
        :host {
            display: flex;
            border-radius: inherit;
            overflow: hidden;
        }
        button {
            all: unset;
            flex: 1;
            width: 100%;
            min-height: 0;
            height: 100%;
            background: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            border-radius: inherit;
        }
        button:active {
            background: #555;
        }
    `;

    @property({ type: String })
    orientation: "up" | "down" = "up";

    @property({ attribute: false })
    events: EventDescriptor | EventDescriptor[] | null | undefined = null;

    override render() {
        return html`
            <button ${on(this.events)}>
                <triangle-icon
                    orientation=${this.orientation}
                    label=${this.orientation}
                ></triangle-icon>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "drum-layout": Layout;
        "equalizer-bar": EqualizerBar;
        "control-group": ControlGroup;
        "drum-button": Button;
        "triangle-icon": Triangle;
        "tempo-button": TempoButton;
    }
}
