export function addComponentValidator(components, options) {
    if (options.onValidate)
        components.push(["validator", options.onValidate]);
}