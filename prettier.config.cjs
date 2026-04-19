module.exports = {
    arrowParens: "always",
    bracketSameLine: false,
    bracketSpacing: true,
    embeddedLanguageFormatting: "auto",
    endOfLine: "crlf",
    htmlWhitespaceSensitivity: "css",
    printWidth: 120, // to match black
    quoteProps: "as-needed",
    semi: true,
    singleQuote: false,
    tabWidth: 4, // to match Python
    trailingComma: "es5",
    useTabs: false,
    vueIndentScriptAndStyle: false,
    overrides: [
        {
            files: ["schemas/*.{yaml,yml}", ".pre-commit-config.yaml"],
            options: {
                tabWidth: 2,
            },
        },
    ],
};
