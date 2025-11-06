import type { EnhancedStyleProperties } from "@remix-run/style";

declare module "preact" {
    namespace JSX {
        interface HTMLAttributes {
            css?: EnhancedStyleProperties;
        }
    }
}
