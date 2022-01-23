import { zip } from "./helpers/collections";

export interface IRefreshDelegate {
	$element: any;
	renderPatch: () => void;
	renderFull: () => void;
}

export class RefreshDelegate implements IRefreshDelegate {
	public $element = null;
	renderPatch = () => {};
	renderFull = () => {};
}

export function createView(id: string, fn: () => any[]): IRefreshDelegate {
	const $ = document.getElementById(id);
	const delegate = {
		$element: null,
		renderPatch: () => {},
		renderFull: () => {},
	};
	renderInto($, [view(delegate, fn)], true);
	return delegate;
}

export function renderView(buildFn: () => any) {
    const r = new RefreshDelegate();
    render(view(r, () => buildFn()));
    return r;
}

export function view(x: IRefreshDelegate, fn: () => any) {
	let v1 = fn();
	x.renderPatch = () => {};
	return ref(($el) => {
		const el = {
			$: $el,
		};
		x.renderPatch = () => {
			const v2 = fn();
			const patch = diff(v1, v2);
			v1 = v2;
			patch(el.$);
		};
		x.renderFull = () => {
			el.$ = replace(el.$, fn());
		};
		x.$element = $el;
	}, v1);
}

export function $(fn: () => any) {
	let v1 = fn();
	let el = {
		$: render(v1),
	};

	return {
		element() {
			return el.$;
		},
		renderPatch(refreshValues: boolean = false) {
			const v2 = fn();
			const patch = diff(v1, v2, refreshValues);
			v1 = v2;
			patch(el.$);
		},
		renderFull() {
			el.$ = replace(el.$, fn());
		},
	};
}

export function ref(fn: ($: any) => void, element: any) {
	element.ref = fn;
	return element;
}

export function attr(fn: (attr: any) => void, element: any) {
	fn(element.attrs);
	return element;
}

export function evt(fn: (events: any) => void, element: any) {
	fn(element.events);
	return element;
}

export function children(fn: (children: any) => void, element: any) {
	fn(element.children);
	return element;
}

export function metre(value, valueMax) {
	return div({ class: "metre" }, [
		div({ class: "bar", style: `width: ${(value / valueMax) * 100}%` }, []),
		div({ class: "bar-text" }, [html(`${value} / ${valueMax}`)]),
	]);
}

function diffAttrs(oldAttrs, newAttrs, refreshValues: boolean = false) {
	const patches = [];

	// set new attributes
	for (const [k, v] of Object.entries(newAttrs)) {
		patches.push(($node) => {
			$node.setAttribute(k, v);
			return $node;
		});
	}

	// remove old attributes
	for (const k of Object.keys(newAttrs)) {
		if (!(k in newAttrs))
			patches.push(($node) => {
				$node.removeAttribute(k);
				return $node;
			});
	}

	if (refreshValues && "value" in newAttrs) {
		console.log("value patch", newAttrs);
		if ("value" in newAttrs) {
			const v = newAttrs.value;
			patches.push(($node) => {
				$node.value = v;
			});
		}
	}

	return ($node) => {
		for (const patch of patches) {
			patch($node);
		}
		return $node;
	};
}

function diffEvents(oldEvents, newEvents) {
	const patches = [];

	for (const [k, fn] of Object.entries(oldEvents)) {
		patches.push(($node) => {
			$node.removeEventListener(k, fn, true);
		});
	}

	for (const [k, fn] of Object.entries(newEvents)) {
		patches.push(($node) => {
			$node.addEventListener(k, fn, true);
		});
	}

	return ($node) => {
		for (const patch of patches) {
			patch($node);
		}
		return $node;
	};
}

function diffChildren(
	oldVChildren,
	newVChildren,
	refreshValues: boolean = false
) {
	const childPatches = [];
	for (const [oldVChild, newVChild] of zip(oldVChildren, newVChildren)) {
		childPatches.push(diff(oldVChild, newVChild, refreshValues));
	}

	// need a better solution to understand the position of the new children, in it's current state all new added nodes will be appended to the bottom (this is fine in most cases as hierarchies will be redrawn however input values will remain which can cause issues)
	const additionalChildPatches = [];

	for (const additionalChild of newVChildren.slice(oldVChildren.length)) {
		additionalChildPatches.push(($node) => {
			$node.appendChild(render(additionalChild));
		});
	}

	for (let i = newVChildren.length; i < oldVChildren.length; i++) {
		additionalChildPatches.push(($node) => {
			if (i >= $node.childNodes.length) return;

			$node.removeChild($node.childNodes[i]);
		});
	}

	return ($parent) => {
		for (const [patch, child] of zip(childPatches, $parent.childNodes)) {
			patch(child);
		}
		for (const patch of additionalChildPatches) {
			patch($parent);
		}
		return $parent;
	};
}

export function diff(vold, vnew, refreshValues: boolean = false) {
	if (!vnew) {
		return ($node) => {
			$node.remove();
		};
	}
	if (
		vold.type === "string" ||
		vnew.type === "string" ||
		vold.type === "html" ||
		vnew.type === "html"
	) {
		if (vold !== vnew)
			return ($node) => {
				return replace($node, vnew);
			};
		else return ($node) => undefined;
	}

	if (vold.tag !== vnew.tag) {
		return ($node) => {
			return replace($node, vnew);
		};
	}

	const patchAttrs = diffAttrs(vold.attrs, vnew.attrs, refreshValues);
	const patchEvents = diffEvents(vold.events, vnew.events);
	const patchChildren = diffChildren(
		vold.children,
		vnew.children,
		refreshValues
	);

	return ($node) => {
		patchAttrs($node);
		patchEvents($node);
		patchChildren($node);

		return $node;
	};
}

export function svg(tag: string, attrs: any, children?: any[]) {
	if (tag === "svg")
		attrs.xmlns = "http://www.w3.org/2000/svg";
	return el(tag, {
		namespace: "http://www.w3.org/2000/svg",
		attrs,
		children,
	});
}

// <svg width="100%" height="100%" viewBox="0 0 64 64" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
//     <g transform="matrix(0.923077,0,0,0.852941,4.30769,13.2059)">
//         <rect x="17" y="15" width="26" height="34"/>
//     </g>
//     <g transform="matrix(1,0,0,0.117647,2,55.2353)">
//         <rect x="17" y="15" width="26" height="34"/>
//     </g>
//     <g transform="matrix(0.923077,0,0,0.588235,4.30769,-4.82353)">
//         <path d="M30,15C19.648,24.895 17.249,37.892 17,49L43,49C41.699,36.217 38.572,24.651 30,15Z"/>
//     </g>
// </svg>

// const namespace = "http://www.w3.org/2000/svg";

// export const viconBullet = el('svg', null, {
//     namespace,
//     attrs: { width: 50, height: 50, viewBox: "0 0 64 64" },
//     children: [
//         el('g', null, {
//             namespace,
//             attrs: {
//                 transform: "matrix(0.923077,0,0,0.852941,4.30769,13.2059)"
//             },
//             children: [
//                 el('rect', null, {
//                     namespace,
//                     attrs: { x: 17, y: 15, width: 26, height: 34 }
//                 }),
//             ]
//         }),
//         el('g', null, {
//             namespace,
//             attrs: {
//                 transform: "matrix(1,0,0,0.117647,2,55.2353)"
//             },
//             children: [
//                 el('rect', null, {
//                     namespace,
//                     attrs: { x: 17, y: 15, width: 26, height: 34 }
//                 }),
//             ]
//         }),
//         el('g', null, {
//             namespace,
//             attrs: {
//                 transform: "matrix(0.923077,0,0,0.588235,4.30769,-4.82353)"
//             },
//             children: [
//                 el('path', null, {
//                     namespace,
//                     attrs: { d: "M30,15C19.648,24.895 17.249,37.892 17,49L43,49C41.699,36.217 38.572,24.651 30,15Z" }
//                 }),
//             ]
//         }),
//     ]
// })

export interface IVirtualElement {}

export function replace($, vel) {
	const $created = render(vel);
	if ($.parentNode) $.parentNode.replaceChild($created, $);
	return $created;
}

// lib
export function render(vel) {
	try {
		if (vel.type === "string") {
			var $container = document.createElement("span");
			$container.innerText = vel.value;
			return $container;
		}

		if (vel.type === "html") {
			var $container = document.createElement("span");
			$container.innerHTML = vel.value;
			return $container;
		}

		if (vel.type === "fragment") {
			return vel.children.map((x) => render(x));
		}

		let $el = null;
		if (vel.namespace !== null)
			$el = document.createElementNS(vel.namespace, vel.tag);
		else $el = document.createElement(vel.tag);

		for (const k of Object.keys(vel.attrs)) {
			$el.setAttribute(k, vel.attrs[k]);
		}

		for (const k of Object.keys(vel.events)) {
			$el.addEventListener(k, vel.events[k], true);
		}

		renderInto($el, vel.children);

		if (vel.ref) {
			vel.ref($el);
		}
		return $el;
	} catch (err) {
		console.error("'render' error", vel);
		// console.trace();
		throw err;
	}
}

export function renderInto($el, list, clear = false) {
	if (clear) $el.innerHTML = "";

	try {
		for (let vel of list) {
			if (!Array.isArray(vel)) vel = [vel];

			for (const v of vel) {
				const $child = render(v);
				try {
					$el.appendChild($child);
				} catch (ex) {
					console.error("'render into' error");
					console.info("$el", $el);
					console.info("$child", $child);
				}
			}
		}
	} catch (err) {
		console.error("render into error");
		console.error("$el", typeof $el, $el);
		console.error("list isArray(", Array.isArray(list), ")", list);
		throw err;
	}
}

// export function renderFloating(virtualElement, screenPosition: () => { x: number, y: number }, millis: number = 1000)
// {
//     const $ui = document.getElementById("ui");
//     const $floating = document.createElement("div");
//     $floating.classList.add("floating");
//     addFloating({
//         time: 0,
//         timeMax: millis / 1000,
//         update: () => {
//             const pos = screenPosition();
//             $floating.style.left = pos.x + "px";
//             $floating.style.top = pos.y + "px";
//         }
//     })
//     renderInto($floating, [virtualElement]);
//     $ui.appendChild($floating);

//     setTimeout(function () {
//         $ui.removeChild($floating);
//     }, millis);
// }

// simple
export function text(value) {
	return {
		type: "string",
		value,
	};
}

export function html(value) {
	return {
		type: "html",
		value,
	};
}

export function cond(value, element) {
	if (value) return element;
	return div({}, []);
}

// complex
export function el(tag, options?) {
	options = options || {};
	const namespace = options.namespace || null;
	let attrs = options.attrs;
	if (!attrs) attrs = {};

	const children = options.children || [];
	let events = options.events;
	if (!events) events = {};

	return {
		type: "element",
		tag,
		namespace,
		attrs,
		children,
		events,
	};
}

export function frag(children) {
	return {
		type: "fragment",
		children,
	};
}

export function icon(name, type = "fas", options?) {
	if (!options) options = {};

	let attrs = options.attrs;
	if (!options.attrs) attrs = {};

	return el("i", {
		...options,
		attrs: { class: `${type} fa-${name}`, ...attrs },
	});
}

export function img(attrs) {
	return el("img", {
		attrs,
	});
}

export function button(attrs, children, onClick, options) {
	if (!options) options = {};
	if (!options.events) options.events = {};
	options.events.click = function (e) {
		if (e.defaultPrevented) return;

		onClick(e);
		return false;
	};

	return el("button", {
		attrs: attrs,
		events: options.events,
		children: children,
	});
}

export function a(attrs, children, onClick, options?) {
	if (!attrs) attrs = {};
	if (!attrs.href) attrs.href = "#";

	if (!options) options = {};
	if (!options.events) options.events = {};
	options.events.click = function (e) {
		if (e.defaultPrevented) return;

		e.preventDefault();

		onClick(e);

		return false;
	};

	return el("a", {
		attrs: attrs,
		events: options.events,
		children: children,
	});
}

export function div(attrs, children) {
	return el("div", {
		attrs,
		children,
	});
}
export function span(attrs, children) {
	return el("span", {
		attrs,
		children,
	});
}

export function input(attrs, type, value, events?) {
	return el("input", {
		attrs: { type, value, ...attrs },
		events,
	});
}

export function label(attrs, contents) {
	return el("label", { attrs, children: contents });
}

export function checkbox(attrs, checked, options) {
	if (!attrs) attrs = {};
	attrs.type = "checkbox";

	if (!options) options = {};
	if (!options.events) options.events = {};
	// if (options.events.change)
	// 	options.events.change = function (e) {
	// 		if (e.defaultPrevented) return;
	// 		onChange(e);
	// 	};

	const input = el("input", {
		attrs: attrs,
		events: options.events,
	});

	if (checked) input.attrs.checked = true;

	return input;
}

export const checkbox2 = function (attrs, checked, options) {
    const tags = ["checkbox"];
    if (checked)
        tags.push("active");
    
    const element = svg('svg', { class: tags.join(' '), width: "30", height: "30", viewBox: "0 0 30 30", ...attrs }, [
		evt(e => Object.keys(options.events ?? {}).forEach(key => e[key] = options.events[key]), svg('g', { class: "bg", fill: "none" }, [
			svg('path', { d: "M 29.5 29.5 L 0.5 29.5 L 0.5 0.5 L 29.5 0.5 L 29.5 29.5 Z", stroke: "none" }),
			svg('path', { d: "M 1 1 L 1 29 L 29 29 L 29 1 L 1 1 M 0 0 L 30 0 L 30 30 L 0 30 L 0 0 Z", stroke: "none", fill: "#000" }),
			svg('path', { class: "check", d: "M1203.8,887.338l4.29,4.031,7.591-8.852", transform: "translate(-1194.163 -871.944)", fill: "none", stroke: "#fff", "stroke-linecap": "square", "stroke-width": 4 })
		])),
	]);
	return element;
}

export function select(attrs, options, value, onChange) {
	if (!options) options = {};
	if (!options.events) options.events = {};
	options.events.change = function (e) {
		if (e.defaultPrevented) return;

		onChange(e);
	};

	const input = el("select", {
		attrs: { ...attrs },
		events: options.events,
	});

	if (attrs.placeholder)
		input.children.push(
			el("option", {
				attrs: { value: "", selected: true, disabled: true },
				children: [text(attrs.placeholder)],
			})
		);

	options.forEach((option) => {
		const optionValue = option.value || option.label;
		const voption = el("option", {
			attrs: { value: optionValue },
			children: [text(option.label)],
		});
		if (value == optionValue) {
			voption.attrs.selected = "selected";
		}

		input.children.push(voption);
	});
	return input;
}

export function dropdown(attrs, labelContents, children) {
	let $container = {
		element: null,
	};

	return div({ ...attrs, class: "dropdown" }, [
		a(
			null,
			{ class: "dropdown-button dropdown-close-ignore" },
			labelContents,
			(e) => {
				if (!$container.element.classList.contains("active"))
					deactivateAllDropdowns();

				$container.element.classList.toggle("active");
			}
		),
		div(
			{ class: "dropdown-content dropdown-close-ignore visible-active" },
			children
		),
	]);
}

// helpers
export function closest(el, className) {
	while (el && el.parentNode) {
		if (el && el.classList && el.classList.contains(className)) {
			return el;
		}
		el = el.parentNode;
	}

	return null;
}

export function addListeners() {
	// console.info("registering otelli listeners");
	window.addEventListener("click", function (event) {
		// console.log(event.target, closest(event.target, 'dropdown-button'));
		// console.log("detected click!", event.target.matches('.dropdown-button'));
		if (!closest(event.target, "dropdown-close-ignore")) {
			deactivateAllDropdowns();
		}
	});
}

export function deactivateAll(className) {
	var targets = document.getElementsByClassName(className);
	var i;
	for (i = 0; i < targets.length; i++) {
		var openDropdown = targets[i];
		if (openDropdown.classList.contains("active")) {
			openDropdown.classList.remove("active");
		}
	}
}

export function deactivateAllDropdowns() {
	deactivateAll("dropdown-content");
}