import { ChatGptApiHandler } from "../external/chatgpt/chatgpt";
import { IframeAgent } from "../external/iframe/iframe_agent";
import { win } from "../tampermonkey_util";

export async function get_question (iframe_agent: IframeAgent): Promise<string> {
    let result = await iframe_agent.evaluate(` return document.getElementById("journal-prompt").innerText; `);
    if (typeof result !== "string") throw new Error(`Unexpected result of type ${typeof result}. Expected a string.`);
    return result;
}

export async function set_answer (iframe_agent: IframeAgent, answer: string): Promise<void> {
    await iframe_agent.evaluate(`
        for (let instance_name in CKEDITOR.instances) {
            let editor = CKEDITOR.instances[instance_name];
            editor.setData('<p>${answer}</p>');
        }
    `);
    return void(0);
}
export async function submit (iframe_agent: IframeAgent): Promise<void> {
    await iframe_agent.evaluate(`
        const button = document.getElementById("SubmitButton");
        button.click();
    `);
    return void(0);
}

export async function autocomplete (chatgpt_api: ChatGptApiHandler) {
    
}