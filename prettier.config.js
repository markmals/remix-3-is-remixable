// @ts-check

/** @type {import("prettier").Config} */
export default {
    printWidth: 100,
    tabWidth: 4,
    arrowParens: "avoid",

    // MARK: Defaults
    // useTabs: false,
    // semi: true,
    // singleQuote: false,
    // trailingComma: "all",
    // proseWrap: "preserve",

    plugins: ["@prettier/plugin-oxc", "prettier-plugin-pkg", "prettier-plugin-toml"],
};
