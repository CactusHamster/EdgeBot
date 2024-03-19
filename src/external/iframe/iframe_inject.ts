import { win } from "../../tampermonkey_util";
export interface EdgeBotMessage {
    // Key to match key set by edgenuity window.
    secret_key: string;
    // Content to evaluate.
    payload: string;
    // ID of the message, used to send back responses.
    id: string;
}
/**
 * Injects evaluate script into iframes.
 */
export function handle_iframe (): void {
    function receive_message (event: MessageEvent) {
        let { origin, data, source } = event;
        if (typeof data !== "string") return;
        try { data = JSON.parse(data) }
        catch (e) { return; }
        if (typeof data !== "object") return;
        if (!message_is_authorized(data)) return;
        if (!is_edgebot_message(data)) return;
        handle_message(source, data);
    }
    win.addEventListener("message", receive_message);
}
function message_is_authorized (data: any): boolean {
    let secret_key = GM_getValue("secret_key", null);
    if (typeof secret_key !== "string") return false;
    if (secret_key !== data.secret_key) return false;
    return true;
}
function is_edgebot_message (data: any): data is EdgeBotMessage {
    if (typeof data !== "object") return false;
    if (typeof data.secret_key !== "string") return false;
    if (typeof data.id !== "string") return false;
    if (typeof data.payload !== "string") return false;
    return true;
}
async function handle_message (source: MessageEventSource | null, message: EdgeBotMessage): Promise<void> {
    let { payload, id, secret_key } = message;
    let is_error = false;
    let result;
    payload = ";(async () => {" + payload + "})();"
    try { result = await eval(payload); }
    catch (e) {
        if (typeof e === "undefined") result = "undefined"
        else if (e === null) result = "null";
        else if (e instanceof Error) {
            result = e.toString() + "\n" +
            (e?.stack ?? "[no stack]") + "\n" + 
            (e.cause ?? "[no cause]") + "\n" + 
            "\n" +
            "\n" +
            payload;
        }
        else result = e.toString();
        is_error = true;
    }
    source?.postMessage(JSON.stringify({ id, is_error, result, secret_key }));
}