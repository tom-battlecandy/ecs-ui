import { stackNames, stack, allComponents } from "./data";

const expressionRegex = /%([\w_\-\.]+)/g;

export function exprVerbose(value: any) {
    const replacements = [];
    if (typeof value === "string") {
        if (!value.includes('%'))
            return {
                value,
                replacements
            };

        // replace all string expressions
        const final = value.replaceAll(expressionRegex, (m, g0) => {
            const parts = g0.split('.');
            const name = parts[0];

            // does an alias exist that matches the provided entity name?
            let id = null;
            if (stackNames[name] !== undefined)
                id = stack[stackNames[name]];
            else
                id = name;
            
            const componentName = parts[1];
            if (componentName == "id")
            {
                replacements.push({
                    type: "id",
                    value: id
                });
                // console.log("expr '", value, "' evaluated id:", id);
                return id;
            }

            const component = allComponents.get(componentName);
            if (!component) {
                console.error(parts);
                throw "ComponentError: couldn't find component with name " + componentName;
            }
            const componentData = component.get(id);
            if (!componentData)
            {
                replacements.push({
                    type: "component_data",
                    entity: id,
                    component: parts[1],
                    key: parts[2],
                    value: "not_found"
                });
                console.warn("Couldn't find component '" + componentName + "' on entity", id);
                return '';
            }

            // console.log("expr '", value, "' evaluated component data:", component[parts[2]] ?? '');
            replacements.push({
                type: "component_data",
                entity: id,
                component: parts[1],
                key: parts[2],
                value: componentData[parts[2]]
            });
            return componentData[parts[2]] ?? '';
        });

        // replace number string with number
        if (typeof final === "string" && !Number.isNaN(Number(final))) {
            return {
                value: Number(final),
                replacements
            };
        }

        return {
            value: final,
            replacements
        }
    }

    return {
        value,
        replacements
    };
}

export function exprBake(value: any) {

    if (typeof value === "string") {
        if (!value.includes('%'))
            return value;

        const final = value.replaceAll(expressionRegex, (m, g0) => {
            const parts = g0.split('.');
            const name = parts[0];
            if (stackNames[name] !== undefined)
                parts[0] = stack[stackNames[name]];
            
            return `%` + parts.join('.');
        });

        return final;
    }

    return value;
}

export function expr(value: any) {

    if (typeof value === "string") {
        if (!value.includes('%'))
            return value;

        const final = value.replaceAll(expressionRegex, (m, g0) => {
            const parts = g0.split('.');
            const name = parts[0];
            let id = null;
            if (stackNames[name] !== undefined)
                id = stack[stackNames[name]];
            else
                id = name;
            
            const componentName = parts[1];
            if (componentName == "id")
            {
                // console.log("expr '", value, "' evaluated id:", id);
                return id;
            }

            const component = allComponents.get(componentName).get(id);
            if (!component)
            {
                console.warn("Couldn't find component '" + componentName + "' on entity", id);
                return null;
            }

            // console.log("expr '", value, "' evaluated component data:", component[parts[2]] ?? '');
            return component[parts[2]] ?? '';
        });

        if (typeof final === "string" && !Number.isNaN(Number(final))) {
            return Number(final);
        }

        return final;
    }

    return value;
}
