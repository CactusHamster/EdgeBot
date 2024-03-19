import { doc, get_tab_async } from "../../tampermonkey_util";
import { Broadcast } from "../tab/broadcast";
import { TabRequest, TabServer } from "../tab/crosstab";
import { GptAuth } from "./api_types";

async function get_answer (question: string): Promise<string> {
    const prompt_textbox = doc.getElementById("prompt-textarea");
    if (!(prompt_textbox instanceof HTMLTextAreaElement)) throw new Error("Failed to find prompt textbox.");
    prompt_textbox.value = question;
    const send_button = prompt_textbox.parentElement?.querySelector('button[data-testid="send-button"]');
    if (!(send_button instanceof HTMLButtonElement)) throw new Error("Failed to find send button.");
    send_button.disabled = false;
    if (send_button.firstChild instanceof HTMLSpanElement) send_button.firstChild.dataset.state = "delayed-open"
    else throw new Error("Failed to find button child.");
    send_button.click();
    throw new Error("unimplemented.");
    return "sample response";
    // Get last answer once it's done being typed by GPT.
}

async function handle_request (request: TabRequest): Promise<void> {
    let { data } = request;
    if (typeof data !== "object") {
        request.error("Invalid data type. Must be a simple object.");
        return;
    }
    switch (data.wants) {
        case "credentials":
            const response = await fetch("https://chat.openai.com/api/auth/session");
            const text = await response.text();
            let json;
            try { json = JSON.parse(text); }
            catch (e) { return request.error("Failed to fetch token."); }
            const credentials: GptAuth = {
                cookie: document.cookie,
                token: json.accessToken,
                expires: json.expires
            }
            request.respond(JSON.stringify(credentials));
        break;
        case "answer":
            const question = request.data.question;
            if (typeof question !== "string") {
                request.error("payload.question is not of type string.")
            } else {
                const answer = await get_answer(question);
                request.respond(answer);
            }
        break;
        case "cookie":
            const cookie = document.cookie;
            request.respond({ cookie });
        break;
        default:
            request.error("Unrecognized request.");
        break;
    }
}

export async function handle_chatgpt (): Promise<void> {
    const tab_obj = await get_tab_async();
    const server = new TabServer(tab_obj);
    server.on("request", handle_request);
    Broadcast.broadcast({ tab_obj, payload: { event_name: "login" } });
}