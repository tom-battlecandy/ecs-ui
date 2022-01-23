import { allEntities, allComponents } from "./data";
import { v4 as uuid } from "uuid";
import { expr } from "./expression";

export function createEntity(components: [name: string, data: any][]): string {
    const id = uuid();
    allEntities.add(id);
    for (var [n, data] of components) {
        if (allComponents.has(n))
            allComponents.get(n).set(id, data);
    }
    return id;
}

export function createNamedEntity(name: string, components: [name: string, data: any][]) {
    allEntities.add(name);
    for (var [n, data] of components) {
        if (allComponents.has(n))
            allComponents.get(n).set(name, data);
    }
    return name;
}

export function updateEntity(id: any, components: [string, any][] = []) {
    id = expr(id);
    for (const [name, data] of components) {
        if (data === null)
        {
            allComponents.get(name).delete(id);
            continue;
        }
        allComponents.get(name).set(id, data);
    }
}

export function duplicateEntity(id: any, componentFilter: string[] = [], components: [string, any][] = []) {
    id = expr(id);
    const final: [name: string, data: any][] = componentFilter.map(name => ([name, JSON.parse(JSON.stringify(allComponents.get(name).get(id)))]));
    for (let comp of components) {
        final.push(comp);
    }
    createEntity(final);
}
