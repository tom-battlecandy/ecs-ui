export const builderState = {
    activeStage: ""
}

export function addComponentUiTargetId(components) {
    if (builderState.activeStage)
        components.push(["ui_target_id", builderState.activeStage]);
}