import { processStyle, createStyleManager, type EnhancedStyleProperties } from "@remix-run/style";
import type { VNode } from "preact";
import { options } from "preact";

// Style management for css prop
const styleManager = typeof window !== "undefined" ? createStyleManager() : null;
const styleCache = new Map<string, { className: string; css: string }>();

// Extend VNode to include internal Preact properties
interface PreactVNode extends VNode {
    _dom?: Element | Text | null;
    __e?: Element | Text | null;
}

// Extended Element to include our custom properties
interface ExtendedElement extends Element {
    __cssClassName?: string;
}

// Save original hooks to chain them
const oldVNodeHook = options.vnode;
const oldDiffedHook = options.diffed;
const oldUnmountHook = options.unmount;

options.vnode = (vnode: PreactVNode) => {
    if (oldVNodeHook) oldVNodeHook(vnode);

    // Filter out css prop from intrinsic elements to prevent it appearing in DOM
    if (typeof vnode.type === "string" && vnode.props) {
        const { css, ...restProps } = vnode.props as any;
        if (css !== undefined) {
            // Store original props for our hooks to access
            (vnode as any).__originalProps = vnode.props;
            // Replace props with filtered version
            vnode.props = restProps;
        }
    }
};

options.diffed = (vnode: PreactVNode) => {
    if (oldDiffedHook) oldDiffedHook(vnode);

    // Use original props if available (for intrinsic elements with filtered props)
    const props = ((vnode as any).__originalProps || vnode.props) as Record<string, unknown>;

    // Handle the `css` prop for dynamic styling
    if (props.css && typeof props.css === "object" && typeof vnode.type === "string") {
        const domElement = vnode.__e || vnode._dom;

        if (domElement instanceof Element) {
            const element = domElement as ExtendedElement;
            const prevClassName = element.__cssClassName || "";

            // Process the css object into a className and css string
            const { className, css } = processStyle(
                props.css as EnhancedStyleProperties,
                styleCache,
            );

            // Only update if the className has changed
            if (prevClassName !== className) {
                // Remove previous className and styles
                if (prevClassName) {
                    element.classList.remove(prevClassName);
                    styleManager?.remove(prevClassName);
                }

                // Add new className and styles
                if (css && className) {
                    element.classList.add(className);
                    styleManager?.insert(className, css);
                    element.__cssClassName = className;
                } else {
                    delete element.__cssClassName;
                }
            }
        }
    } else if (typeof vnode.type === "string") {
        // If there's no css prop but there was one previously, clean it up
        const domElement = vnode.__e || vnode._dom;
        if (domElement instanceof Element) {
            const element = domElement as ExtendedElement;
            const prevClassName = element.__cssClassName;
            if (prevClassName) {
                element.classList.remove(prevClassName);
                styleManager?.remove(prevClassName);
                delete element.__cssClassName;
            }
        }
    }
};

options.unmount = (vnode: PreactVNode) => {
    if (oldUnmountHook) oldUnmountHook(vnode);

    // Clean up CSS classes and styles
    const domElement = vnode.__e || vnode._dom;
    if (domElement instanceof Element) {
        const element = domElement as ExtendedElement;

        if (element.__cssClassName) {
            element.classList.remove(element.__cssClassName);
            styleManager?.remove(element.__cssClassName);
            delete element.__cssClassName;
        }
    }
};
