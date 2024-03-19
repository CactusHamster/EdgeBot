import { EdgeBotMessage } from "./iframe_inject";
interface IframeResultPayload {
    id: string,
    result: any,
    secret_key: string,
    is_error: boolean
}
interface ResponsePromise {
    id: string,
    resolve: (value: any) => void,
    reject: (reason?: any) => void
}
function is_iframe_result_payload (payload: any): payload is IframeResultPayload {
    if (typeof payload !== "object") return false;
    if (typeof payload.id !== "string") return false;
    if (typeof payload.secret_key !== "string") return false;
    if (typeof payload.is_error !== "boolean") return false;
    return true;
}
export class IframeAgent {
    iframe: HTMLIFrameElement;
    secret_key: string;
    response_promises: ResponsePromise[] = [];
    constructor (window: Window, iframe: HTMLIFrameElement) {
        this.iframe = iframe;
        this.secret_key = Math.random().toString();
        GM_setValue("secret_key", this.secret_key);
        window.addEventListener("message", this.#handle_incoming_message.bind(this));
    }
    #handle_incoming_message (event: MessageEvent): void {
        let { data } = event;
        if (typeof data !== "string") return;
        try { data = JSON.parse(data) }
        catch (e) { return; }
        if (typeof data !== "object" || !is_iframe_result_payload(data) || data.secret_key !== this.secret_key) return;
        let resolved_by_event = this.response_promises.find((promise: ResponsePromise) => promise.id === data.id);
        if (typeof resolved_by_event === "undefined") return;
        if (data.is_error) {
            console.error(data);
            resolved_by_event.reject(data.result);
        }
        else resolved_by_event.resolve(data.result);
    }
    evaluate (payload: string): Promise<any> {
        let id = Date.now().toString();
        let payload_obj: EdgeBotMessage = {
            id,
            payload,
            secret_key: this.secret_key,
        };
        return new Promise((resolve, reject) => {
            if (this.iframe.contentWindow === null) return reject("Cannot access iframe window.");
            let promise_obj: ResponsePromise = { id, resolve, reject };
            this.response_promises.push(promise_obj);
            this.iframe.contentWindow.postMessage(JSON.stringify(payload_obj));
        });
    }
}