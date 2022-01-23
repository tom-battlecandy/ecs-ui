import { allComponents } from "./data";
import { expr } from "./expression";

export function createComponent(name: string, overwrite: boolean = false) {
    if (!overwrite && allComponents.has(name))
        return;
    
    allComponents.set(name, new Map<string, any>());
}
export function setComponent(id: string, componentName: string, value: any) {
    allComponents.get(componentName).set(id, value);
}
export function getComponent(id: string, componentName: string) {
    id = expr(id);
    const component = allComponents.get(componentName).get(id);
    // if (!component)
    //     console.warn("missing component", componentName, "on", id,
    //         JSON.stringify(Array.from(allComponents.get(componentName).keys())));
    return component;
}
export function getComponentEntries(componentName: string) {
    return allComponents.get(componentName).entries();
}

export function updateComponent(id: string, componentName: string, fn: (any) => any) {
    let data = getComponent(id, componentName);
    data = fn(data);
    setComponent(id, componentName, data);
}