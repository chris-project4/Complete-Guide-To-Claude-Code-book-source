// Tiny DOM helpers — keep view code declarative and free of repetitive
// document.createElement boilerplate. No business logic lives here.

type Attrs = Record<string, string | number | boolean | EventListener>;
type Child = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (typeof value === "boolean") {
      if (value) node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

// Replace the contents of a host element with new nodes.
export function render(host: HTMLElement, ...nodes: Child[]): void {
  host.replaceChildren(...nodes.map((n) => (typeof n === "string" ? document.createTextNode(n) : n)));
}
