import { builderState } from "./builder";
import { getComponent } from "./component";
import { allComponents, allEntities, stack, stackNames } from "./data";
import { div, RefreshDelegate, view } from "./dom";
import { createNamedEntity } from "./entity";
import { deregisterListenerEvents } from "./events";
import { expr, exprBake } from "./expression";

export class FieldComponent {
	public value: string = "";
	public message: string = "";

	public $message;

	get(): string {
		return this.value;
	}

	set(value: string): void {
		this.value = value;
	}

	setMessage(value: string): void {
		if (this.$message) this.$message.innerHTML = value;
		this.message = value;
	}
}

export const defaults = {
    valueEntity: ""
}

export function setDefaultValueEntity(id: string) {
    defaults.valueEntity = id;
}

export function toCssClass(css: string[], tags?: string[]) {
    return [...(css||[]), ...(tags||[])].filter(x => x).join(' ');
}

export function exprObj(obj: any) {
    return Object.keys(obj).reduce((final, key) => {
        if (typeof obj[key] === "string")
        {
            if (obj[key].includes('%'))
            {
                final[key] = expr(obj[key]);
                final[key + "_expr"] = exprBake(obj[key]);    
            }
            else
            {
                final[key] = obj[key];
            }
        }
        else
            final[key] = obj[key];
        return final;
    }, {});
}

export function build(buildOptions) {
    switch (buildOptions.method) {
        case "field":
            return buildField(buildOptions.options.type, exprObj(buildOptions.options));
        case "for-entities":
            return buildForEntities(buildOptions.options.filter, buildOptions.options.alias, buildOptions.options.buildOptions, build);
    }
}

export function buildEditor(buildOptions) {
    switch (buildOptions.method) {
        case "field":
            return buildFieldEditor(buildOptions.options.type, exprObj(buildOptions.options));
        case "for-entities":
            return buildForEntities(buildOptions.options.filter, buildOptions.options.alias, buildOptions.options.buildOptions, buildEditor);
    }
}

export function buildField(name: string, options: any) {
    const f = getComponent("build_form", "build")[name];

    if (!f)
        throw `ElementError: unrecognised field type (${name})`;

    return f(options);
}

export function buildFieldEditor(name: string, options: any) {
    const f = getComponent("build_edit", "build")[name];
    if (!f)
        throw `ElementError: unrecognised field editor type (${name})`;

    return f(options);
}

export function buildForEntities(componentFilter: string[] = [], alias: string, fieldOptions: any, op: (options: any) => any) {
    let entityIds = [];
    if (componentFilter.length == 0)
        entityIds = Array.from(allEntities.values());
    else
    {
        if (!allComponents.has(componentFilter[0]))
            throw `Undefined component ${componentFilter[0]}`;
        
        entityIds = Array.from(allComponents.get(componentFilter[0]).keys());
        for (var i = 1; i < componentFilter.length; i++)
        {
            var key = componentFilter[i];
            if (!allComponents.has(key))
                throw `Undefined component ${key}`;

            var componentEntityIds = Array.from(allComponents.get(key).keys());
            entityIds = entityIds.filter(id => componentEntityIds.includes(id));
        }
    }

    const vels = [];
    for (const id of entityIds) {
        // add entity id to the stack
        stack.push(id);
        // add alias to the stack names and point to stack index (where the ID is stored for the alias)
        stackNames[alias] = stack.length - 1;

        // process the field build options
        vels.push(op(fieldOptions));

        // remove entity ID from the stack
        stack.splice(stackNames[alias], 1);
        // remove alias from the stack names
        delete stackNames[alias];
    }
    return vels;
}

export class FormComponent extends RefreshDelegate {
    stage: string = null;
}

export function buildView(options: any, fnChildren: (id: string) => any[]) {
    const delegate = new FormComponent();
    const id = createNamedEntity(options.name, [
        ["ui_state", delegate],
    ]);
    
    return view(
        delegate,
        () => {
            for (let [childId, stageId] of allComponents.get("ui_target_id").entries()) {
                if (stageId == id)
                {
                    deregisterListenerEvents(childId);
                    allEntities.delete(childId);
                    for (let component of allComponents.values())
                        component.delete(childId);
                }
            }

            builderState.activeStage = id;
            const children = fnChildren(id);
            builderState.activeStage = "";
            
            return div({ id, class: toCssClass(["form"], options.tags) }, children);
        }
    );
}

export function stage(name: string, fields: any[]) {
    const entityId = "ui_" + name;
    createNamedEntity(entityId, [
        ["ui", fields]
    ]);
    return entityId;
}

export function field(type: string, options: any) {
    return {
        method: "field",
        options: {
            type,
            ...options
        }
    }
}

export function forEntities(filter: string[], alias: string, field: any) {
    return {
        method: "for-entities",
        options: {
            filter,
            alias,
            buildOptions: field
        }
    }
}