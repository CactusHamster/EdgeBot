// import { ChatGPTClient } from "../external/chatgpt/chatgpt_client";
// import { is_written } from "../activities/general";
import { AppContext, OutputBox } from "../app";
import { GptResponse } from "../external/chatgpt/api_types";
import { ChatGptApiHandler } from "../external/chatgpt/chatgpt";
import { IframeAgent } from "../external/iframe/iframe_agent";

async function print_chatgpt_answer (api: ChatGptApiHandler, iframe_agent: IframeAgent, box: OutputBox) {
    /*if (is_written()) {
        let callback = ({ message }: GptResponse) => set_answer_written(iframe_agent, message.content.parts[0]);
        const question = "Respond in 3 sentences. " + (await get_question(iframe_agent));
    }
    await api.answer(question, callback);*/
}

let busy = false;
export async function attach_chatgpt_to_app ({ app, activity_iframe_agent: iframe_agent }: AppContext) {
    const btn = app.querySelector("#chatgpt-button");
    if (!(btn instanceof HTMLButtonElement)) throw new Error("Failed to attach ChatGPT to button.");
    const box = new OutputBox(app, "#chatgpt-output");
    const api = new ChatGptApiHandler();
    btn.addEventListener("click", async () => {
        if (iframe_agent === null) return box.error("Iframe executor was not initialized.");
        if (!busy) {
            busy = true;
            await print_chatgpt_answer(api, iframe_agent, box);
            busy = false
        }
    });
}