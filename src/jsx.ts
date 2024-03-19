import { doc } from "./tampermonkey_util";
const SVG_NAMESPACE_URI = "http://www.w3.org/2000/svg";
type HTMLAttributes = {
  [id: string]: string | undefined;
  _is_svg: "false" | undefined;
};
type SVGAttributes = {
  [id: string]: string | undefined;
  _is_svg: "true";
};

let parse_children = (children: Element[] | string[]): (Element | Text)[] =>
  children.map(child => typeof child == "string" ? doc.createTextNode(child) : child);
let default_value = <T1,T2>(value: T1, fallback_value: T2): T1 | T2 =>
  (value === undefined || value === null) ? fallback_value : value;

export const JSX = {
  createElement<Attributes extends HTMLAttributes | SVGAttributes>(name: string | Function, properties: Attributes, ...children: Element[] | string[]): Attributes extends HTMLAttributes ? HTMLElement : SVGElement {
    properties = default_value(properties, {} as Attributes);
    if (typeof name == "function") return name({ ...properties, children });
    let is_svg = properties._is_svg === "true";
    let element = is_svg ? doc.createElementNS(SVG_NAMESPACE_URI, name) : doc.createElement(name);
    for (let property_name in properties) {
      if (property_name === "_is_svg") continue;
      let property_value = properties[property_name];
      if (property_value === undefined || property_value === null) continue;
      else element.setAttribute(property_name, property_value);
    };
    parse_children(children).forEach(child => element.appendChild(child));
    return element as any;
  }
}
export default JSX;