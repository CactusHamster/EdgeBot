import { JSX } from "./jsx";;
import { gen_app_html, CSS } from "./app_widget";
import { doc, win, log, get_tab_async } from "./tampermonkey_util";
import { IframeAgent } from "./external/iframe/iframe_agent";
export interface AppContext {
    app: HTMLElement;
    gpt: ChatGptApiHandler;
    activity_iframe: HTMLIFrameElement;
    activity_iframe_agent: IframeAgent;
}
/**
 * Generate an App widget.
 */
async function App (): Promise<HTMLElement> {
    log("Generating App.");
    const app_container: HTMLElement = <div></div>;
    app_container.style.display = "none";
    const app_root = app_container.attachShadow({"mode": "open"});
    const app: HTMLElement = gen_app_html();
    (app.getElementsByClassName("icon")[0] as HTMLElement).addEventListener("click", (event: MouseEvent) => close_app(app_container));
    app.style.position = "absolute";
    app.style.top = "40px";
    app.style.left = "-100px";
    make_draggable(app, app.getElementsByClassName("header")[0] as HTMLElement ?? null);
    app_root.appendChild(<style>{CSS}</style>)
    app_root.appendChild(app);
    await attach_functions_to_app(app);
    return app_container;
}
/* Will need refactoring in future to get rid of debug controls and unnecessary functions. */
// import { attach_brainly_to_app } from "./actions/brainly_answer";
// import { attach_chatgpt_to_app } from "./actions/chatgpt_answer";
import { find_activity_iframe } from "./activities/general";
// import { attach_vocab_to_app_debug } from "./activities/vocabulary";
// import { attach_video_skipper_to_app } from "./actions/skip_video";
// import { ShortAnswer } from "./activities/online_content";
import { ChatGptApiHandler } from "./external/chatgpt/chatgpt";
import { attach_autocomplete_to_app } from "./actions/autocomplete";
/*function attach_writer_to_app_debug (app: HTMLElement, { activity_iframe_agent: agent }: AppContext) {
    if (!agent) throw new Error("Iframe agent required.");
    const btn = app.querySelector("#do-the-textbox") as HTMLButtonElement;
    btn.onclick = async () => ShortAnswer.write_to_textbox(agent, await ShortAnswer.get_question(agent));
}*/
/**
 * Attach functionality to App's GUI.
 * @param {HTMLElement} app 
 */
async function attach_functions_to_app (app: HTMLElement) {
    const iframe = find_activity_iframe();
    if (iframe === null) throw new Error("Failed to find activity iframe.");
    const iframe_agent = new IframeAgent(win, iframe);
    ;(unsafeWindow as any).iframe = iframe;
    ;(unsafeWindow as any).iframe_agent = iframe_agent;
    const context: AppContext = {
        activity_iframe: iframe,
        activity_iframe_agent: iframe_agent,
        gpt: new ChatGptApiHandler(),
        app: app,
    }
    /*attach_brainly_to_app(app, context);
    attach_vocab_to_app_debug(app, context);
    attach_writer_to_app_debug(app, context);
    attach_video_skipper_to_app(app, context);
    attach_chatgpt_to_app(context);*/
    attach_autocomplete_to_app(context);
}
/**
 * Generate a button to open the App widget
 * @param app App to attach to the button
 * @returns {HTMLElement} The generated button
 */
function AppButton (app: HTMLElement): HTMLElement {
    const button: HTMLElement = <li class="eb_button"> <a href="#" class="nav dave">EdgeBot</a> </li>
    if (!("addEventListener" in button)) throw new Error("Failed to add Event Listener to button.");
    button.addEventListener("click", (event: MouseEvent) => toggle_app(app));
    return button;
}
function is_app_open (app: HTMLElement): boolean { return app.style.display !== "none"; }
function close_app (app: HTMLElement): void { app.style.display = "none"; }
function open_app (app: HTMLElement): void { app.style.display = "block"; }
function toggle_app (app: HTMLElement): void {
    if (is_app_open(app)) close_app(app);
    else open_app(app);
}
/**
 * Resolves a value to an HTMLElement. Returns null on failure.
 * @param element Value to resolve.
 * @returns {HTMLElement | null} The resolved element.
 */
function resolve_to_html_element(element: HTMLElement | string | null): HTMLElement | null {
    return element instanceof HTMLElement ? element : typeof element === "string" ? document.querySelector(element) : null;
}
/**
 * Make an HTMLElement draggable by `drag_handle`.
 * @param element HTMLElement to be dragged.
 * @param drag_handle HTMLElement to drag with.
 */
function make_draggable(widget: HTMLElement | string | null, drag_handle: HTMLElement | string | null): void {
    const widget_element = resolve_to_html_element(widget) || throwNullError("Widget element");
    const drag_handle_element = resolve_to_html_element(drag_handle) || throwNullError("Drag handle element");
    let last_mouse_at_x = 0;
    let last_mouse_at_y = 0;
    let mouse_down = false;
    function handle_mouse_down (event: MouseEvent) {
        mouse_down = true;
        last_mouse_at_x = event.clientX;
        last_mouse_at_y = event.clientY;
    }
    function handle_mouse_move (event: MouseEvent) {
        if (mouse_down === true) {
            let mouse_difference_x = last_mouse_at_x - event.clientX;
            let mouse_difference_y = last_mouse_at_y - event.clientY;
            last_mouse_at_x = event.clientX;
            last_mouse_at_y = event.clientY;
            widget_element.style.left = (widget_element.offsetLeft - mouse_difference_x) + "px";
            widget_element.style.top = (widget_element.offsetTop - mouse_difference_y) + "px";
        }
    }
    function handle_mouse_up (event: MouseEvent) { mouse_down = false;}
    drag_handle_element.addEventListener("mousedown", handle_mouse_down)
    doc.addEventListener("mousemove", handle_mouse_move)
    doc.addEventListener("mouseup", handle_mouse_up);
}
function throwNullError(elementName: string): never {
    throw new Error(`${elementName} is null.`);
}
/**
 * Returns a promise that resolves when an element of the selector is added to the document.
 * @param element_selector QuerySelector string for the element.
 */
function wait_for_element_to_exist(element_selector: string): Promise<Element> {
    return new Promise(resolve => {
        let first_try_elem = doc.querySelector(element_selector);
        if (first_try_elem !== null) return resolve(first_try_elem);
        else {
            const observer = new MutationObserver(mutations => {
                const found = doc.querySelector(element_selector)
                if (found !== null) {
                    observer.disconnect();
                    resolve(found);
                }
            });
            observer.observe(doc.body instanceof Node ? doc.body : doc.documentElement, {
                childList: true,
                subtree: true
            });
        }
    });
}
/**
 * Append a generated App GUI to the Edgenuity page.
 * @param doc document to append to
 */
export async function append_app_to_page (): Promise<void> {
    const app = await App();
    const app_button = AppButton(app);

    const button_parent_query = ".head-nav";
    const button_parent = await wait_for_element_to_exist(button_parent_query);
    if (button_parent == null) throw new Error("Failed to find a place to put the App button.");

    const app_parent_query = ".mainhead";
    const app_parent = await wait_for_element_to_exist(app_parent_query);
    if (app_parent == null) throw new Error("Failed to find a place to put the App.");

    button_parent.prepend(app_button);
    button_parent.append(app);
}


export class OutputBox {
    element: HTMLElement;
    constructor (app: HTMLElement, textbox: string | HTMLElement | null) {
        textbox = typeof textbox === "string" ? app.querySelector(textbox) as HTMLElement : textbox;
        if (textbox === null) throw new Error("Failed to find textbox.");
        this.element = textbox;
    }
    color (color: string): void {
        this.element.style.color = color;
    }
    print (text: string): void {
        this.element.innerText = text;
    }
    info (txt: string): void {
        this.color("white");
        this.print(txt);
    }
    error (err: string): void {
        this.color("red");
        this.print(err);
    }
}