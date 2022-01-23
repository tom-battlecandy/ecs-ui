import { exprVerbose } from "./expression";
import { valueBuffer } from "./value-buffer";

const events = new Map<string, Map<string, () => void>>();
const entities = new Map<string, string[]>();

export function registerListener(listenerId: string, eventKey: string, fn: () => void) {
    if (!events.has(eventKey))
        events.set(eventKey, new Map());
    
    if (!entities.has(listenerId))
        entities.set(listenerId, []);

    events.get(eventKey).set(listenerId, fn);
    entities.get(listenerId).push(eventKey);
}

export function deregisterListenerEvents(listenerId: string) {
    if (!entities.has(listenerId))
        return;

    var eventKeys = entities.get(listenerId);
    for (var key of eventKeys) {
        if (!events.has(key))
            continue;
        
        const e = events.get(key);
        e.delete(listenerId);
        if (e.size === 0)
            events.delete(key);
    }

    entities.delete(listenerId);
}

export function triggerEvent(eventKey: string) {
    if (!events.has(eventKey))
        return;

    for (let fn of events.get(eventKey).values()) {
        fn();
    }
}

// triggers the event if any component data within the expression is updated
export function registerExpressionListener(listenerId: string, expression: string, onValueChanged: () => void) {
	const keys = [];
    if (expression) {
        console.log(expression);
		const valueExpr = exprVerbose(expression);
		if (valueExpr.replacements.length > 0) {
			for (var e of valueExpr.replacements) {
				if (e.type === "component_data") {
                    keys.push(e.key);
					registerListener(listenerId, `set:${e.entity}.${e.component}.${e.key}`, onValueChanged);
                    valueBuffer.registerExpressionListener(e.key, onValueChanged);
				}
			}
            onValueChanged();
		}
	}
    return keys;
}