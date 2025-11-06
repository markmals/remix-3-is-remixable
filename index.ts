#!/usr/bin/env bun run

import { serve } from "bun";
import index from "./examples/index.html";
import signals from "./examples/dom-signals/index.html";
import lit from "./examples/events-lit/index.html";
import preact from "./examples/style-preact/index.html";

const server = serve({
    port: 1612,
    development: {
        hmr: true,
        console: true,
    },
    routes: {
        "/": index,
        "/dom-signals": signals,
        "/events-lit": lit,
        "/style-preact": preact,
    },
});

console.log(`Development server running at ${server.url}`);
