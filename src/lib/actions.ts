import { getComponent, getComponentEntries, setComponent, updateComponent } from "./component";
import { allComponents } from "./data";
import { expr } from "./expression";
import { triggerEvent } from "./events";
import { defaults } from "./fields";
import { valueBuffer } from "./value-buffer";
import { duplicateEntity, updateEntity } from "./entity";

export const actions = new Map<
	string,
	(
		options: any,
		entityId: string,
		next: () => void,
		reject: () => void
	) => void
>();

export function execute(
	action: { type: string; options: any },
	sourceId: string
) {
	if (!action || !action.type) return;

	actions.get(action.type)(
		action.options,
		sourceId,
		() => {},
		() => {}
	);
}

export function commitFieldValues() {
	const validationFails: string[] = [];
	for (let [id, validator] of allComponents.get("validator").entries()) {
		actions.get(validator.type)(
			validator.options,
			id,
			() => {},
			() => {
				validationFails.push(id);
			}
		);
	}

	if (validationFails.length > 0) return false;

	for (let [id, field] of getComponentEntries("field")) {
		if (typeof field.get !== "function")
			continue;
		
		const options = getComponent(id, "options");
		const entity = expr(options.entity ?? defaults.valueEntity);
		const values = getComponent(entity, "values");
		if (!values) {
			console.warn("no value entity defined for " + options.name);
			continue;
		}

		const value = field.get();

		field.set(value);
		if (!value || value == "") delete values[options.name];
		else values[options.name] = value;

		triggerEvent(`set:${entity}.values.${options.name}`);
	}
	return true;
}

export function registerActionsCore() {
	actions.set("series", (options, sourceId, next, reject) => {
		seriesNext(options.actions, 0, sourceId, next, reject);
	});

	actions.set(
		"required",
		(
			actionOptions: any,
			sourceId: string,
			next: () => void,
			reject?: () => void
		) => {
			const field = getComponent(sourceId, "field");
			if (typeof field.hasValue == "function" && !field.hasValue()) {
				field.setMessage("Required Field");
				reject();
				return;
			}
			field.setMessage("");
			next();
		}
	);
    
	actions.set(
		"commit",
		(
			actionOptions: any,
			sourceId: string,
			next: () => void,
			reject?: () => void
		) => {
			if (!commitFieldValues()) {
				reject();
				return;
			}
			next();
		}
	);
	actions.set(
		"mount",
		(
			actionOptions: any,
			sourceId: string,
			next: () => void,
			reject?: () => void
		) => {

			// commit values
			if (actionOptions.commit && !commitFieldValues()) {
				reject();
				return;
			}

			const entity = actionOptions.containerEntity ?? getComponent(sourceId, "ui_target_id");
			const state = getComponent(entity, "ui_state");
			state.stage = actionOptions.name;
            valueBuffer.clear();
			state.renderFull();
			next();

		}
	);
	actions.set("close-form", (options, sourceId, next) => {
		const state = getComponent(expr(options.entity), "ui_state");
		state.stage = null;
		state.renderFull();
		next();
	});
	actions.set("transfer", (options, sourceId, next, reject) => {
		const fromId = expr(options.from);
		let to = null;
		const componentsToAdd: [string, any][] = options.components || [];
		
		if (options.to) {
			to = expr(options.to);
		}
		
		if (!to)
		{
			// duplicate the buffer entity into a new entity
			duplicateEntity(
				fromId,
				options.filter || [], // components to copy
				componentsToAdd
			);
		}
		else {
			for (const componentName of options.filter) {
				if (options.serialize)
					setComponent(to, componentName, JSON.parse(JSON.stringify(getComponent(fromId, componentName))));
				else
					setComponent(to, componentName, getComponent(fromId, componentName));
			}
			for (const [componentName, data] of componentsToAdd) {
				setComponent(to, componentName, data);
			}
		}

		next();
	});
}

export const actionsCore = {
    required: {
        type: "required",
        options: {},
    },
    series: (actions: any[]) => ({    
        type: "series",
        options: {
            actions,
        },
    }),
    commit: {
        type: "commit",
        options: {},
    },
    mount: (name: string, commit: boolean = true, containerEntity?: any) => ({
        type: "mount",
        options: {
            name,
            commit,
            containerEntity,
        },
    }),
    close: entity => ({
        type: "close-form",
        options: {
            entity,
        },
    }),
	transfer: (from: string, to: string, filter: string[], components: [string, any][] = [], serialize: boolean = true) => ({
		type: "transfer",
		options: {
			from,
			to,
			filter,
			components,
			serialize
		}
	})
}

function seriesNext(list, i, sourceId, next, reject) {
	if (i >= list.length) {
		next();
		return;
	}

	actions.get(list[i].type)(
		list[i].options,
		sourceId,
		() => {
			seriesNext(list, i + 1, sourceId, next, reject);
		},
		() => {
			console.warn("series rejected", i);
			reject();
		}
	);
}
