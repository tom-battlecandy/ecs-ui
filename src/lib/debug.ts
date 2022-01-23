import { actions } from "./actions";
import { allComponents, allEntities } from "./data";
import { RefreshDelegate, view, el, html, render } from "./dom";

export function buildDebugEntityTable(delegate: RefreshDelegate) {
    return view(delegate, () => el("table", {
        attrs: { class: "table-entities-debug" },
        children: [
            el("tr", {
                children: [
                    el("th", {
                        children: [html("id")]
                    }),
                    ...Array.from(allComponents.entries()).map(([name, data]) => el("th", {
                        children: [html(name)]
                    }))
                ]
            }),
            ...Array.from(allEntities.values()).map(id => el("tr", {
                children: [
                    el("td", { children: [html(`${id}`)] }),
                    ...Array.from(allComponents.entries()).map(([name, component]) => {
                        const data = component.get(id);
                        if (data)
                            return el("td", {
                                children: [html(`<pre>${JSON.stringify(data, null, 4)}</pre>`)]
                            });
                        return el("td", {
                            children: [html("")]
                        });
                    })
                ]
            }))
        ]
    }));
}

const $debug = new RefreshDelegate();
export function createDebugEntityTable() {
    
    actions.set("refresh-entities", (options, entityId, next) => {
        $debug.renderFull();
        next();
    });

    return render(buildDebugEntityTable($debug));
}

export function createDebugEntityTableRefreshAction() {
    return {
        type: "refresh-entities",
        options: {}
    };
}

export function refreshDebugEntityTable() {
    $debug.renderFull();
}