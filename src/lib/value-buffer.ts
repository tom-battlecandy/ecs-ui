import { createComponent, getComponent, setComponent } from "./component";
import { createNamedEntity } from "./entity";
import { triggerEvent } from "./events";
import { defaults } from "./fields";

class ValueBuffer {
    init() {
        createComponent("values");
        createComponent("buffer_reg");
        createNamedEntity("buffer", [
            ["values", {}],
            ["buffer_reg", new Map<string, [any, ($: any, value: string) => void][]>()],
        ]);
    }

    clear() {
        const keys = Object.keys(getComponent("buffer", "values") ?? {});
        setComponent("buffer", "values", {});
        for (const k of keys) {
            triggerEvent(`set:buffer.values.${k}`);
        }
    }

    get(name: string) {
        const values = getComponent("buffer", "values");
        return values[name];
    }

    set(name: string, value: string) {
        const values = getComponent("buffer", "values");
        const registrations = getComponent("buffer", "buffer_reg");
        values[name] = value;

        triggerEvent(`set:buffer.values.${name}`);

        if (registrations.has(name)) {
            for (const [$, fn] of registrations.get(name)) {
                fn($, value);
            }
        }
    }
    
    register(name: string, $: any, onUpdated: ($: any, value: string) => void) {
        const registrations = getComponent("buffer", "buffer_reg");
        if (!registrations.has(name))
            registrations.set(name, []);

        registrations.get(name).push([$, onUpdated]);
    }

    registerExpressionListener(name: string, onUpdated: () => void) {
        const registrations = getComponent("buffer", "buffer_reg");
        if (!registrations.has(name))
            registrations.set(name, []);

        registrations.get(name).push([null, () => {
            onUpdated();
        }]);
    }
}

export const valueBuffer = new ValueBuffer();

export function loadExistingValues(options, fn: (value: any) => void) {
    const committed = getComponent(options.entity ?? defaults.valueEntity, "values");
    if (options.name && committed && committed[options.name])
    {
        fn(committed[options.name]);
    }
}