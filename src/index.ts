import { registerActionsCore } from "./lib/actions";
import { createComponent } from "./lib/component";
import { createNamedEntity } from "./lib/entity";
import { valueBuffer } from "./lib/value-buffer";

export function initEcsUi() {

    // used to register new field builders
    createComponent("build");
    createNamedEntity("build_form", [["build", {}]]);
    createNamedEntity("build_edit", [["build", {}]]);

    

    valueBuffer.init();
    createComponent("values");
    createComponent("options");
    createComponent("field");
    createComponent("validator");
    createComponent("ui");
    createComponent("ui_state");
    createComponent("ui_target_id");
    
    registerActionsCore();
}