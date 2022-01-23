import { getComponent } from "./component";
import { render } from "./dom";
import { expr } from "./expression";
import { build, buildEditor, buildView } from "./fields";

export function createView(name: string, stage: string) {
    return render(
        buildView({ name, tags: ["ui"] }, (id) => {
            const state = getComponent(`%${name}.id`, "ui_state");
            if (!state.stage) state.stage = stage;

            const stageBuilder = getComponent("%ui_" + state.stage + ".id", "ui");
            if (stageBuilder) {
                return stageBuilder.map((buildOptions) => build(buildOptions));
            }
            return [];
        })
    );
}

export function createViewEditor(name: string, stage: string) {
    return render(
        buildView({ name, tags: ["ui"] }, () => {
            const state = getComponent(`%${name}.id`, "ui_state");
            if (!state.stage) state.stage = stage;

            const stageBuilder = getComponent("%ui_" + state.stage + ".id", "ui");
            if (stageBuilder) {
                return stageBuilder.map((buildOptions) => buildEditor(buildOptions));
            }
            return [];
        })
    );
}