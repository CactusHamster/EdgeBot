import { IframeAgent } from "../external/iframe/iframe_agent"
// Short-answer activities.
export namespace ShortAnswer {
    export type ShortAnswerIframe = HTMLIFrameElement;
    export interface OnlineContentLink {
        title: string,
        url: string
    }
    /**
     * Fetches online content supplementary to the ShortAnswer prompt.
     * @param iframe_agent 
     * @returns 
     */
    export function get_online_content_links (iframe_agent: IframeAgent): Promise<OnlineContentLink[]> {
        return iframe_agent.evaluate(`
            const online_content_ul = unsafeWindow.document.querySelector("OnlineContent-Links");
            let online_content_links: OnlineContentLink[] = [];
            if (online_content_ul !== null) {
                for (let i in online_content_ul.children) {
                    let li = online_content_ul.children[i];
                    let a = li.firstElementChild;
                    if (!(a instanceof HTMLAnchorElement)) continue;
                    console.warn("Failed to find anchor for online content.");
                    let title = a.innerText
                    let url = a.href;
                    if (!url.startsWith("http")) {
                        if (url.startsWith("//")) url = window.location.protocol + url;
                        else if (url.startsWith("/")) url = window.location.origin + url;
                        else url = window.location.href + "/" + url;
                    }
                    if (url.startsWith("/")) url = window.location.origin + url;
                    online_content_links.push({ title, url });
                }
            }
            return online_content_links;
        `);
    }
    /**
     * Fetches the ShortAnswer prompt.
     * @param iframe_agent 
     * @returns 
     */
    export function get_question (iframe_agent: IframeAgent): Promise<string> {
        return iframe_agent.evaluate(`
            let question = null;
            const parent = unsafeWindow.document.querySelector("#contentViewer");
            console.log(parent);
            for (let i in parent.children) {
                let child = parent.children[i] ?? null;
                if (child === null) continue;
                let grandchild = child.firstElementChild;
                if (grandchild === null) continue;
                if (grandchild.tagName.toLowerCase() === "p") {
                    question = grandchild.innerText;
                    break;
                }
            }
            return question;
        `);
    }
    /**
     * Writes specified text to the ShortAnswer Activity's iframe.
     * @param iframe_agent 
     * @param content 
     */
    export function write_to_textbox (iframe_agent: IframeAgent, content: string): Promise<void> {
        return iframe_agent.evaluate(`
            for (let instance_name in CKEDITOR.instances) {
                let editor = CKEDITOR.instances[instance_name];
                editor.setData('<p>${content}</p>');
            }
            $("#SubmitQuestionsButton").removeAttr("disabled").removeClass("disabled");
        `);
    }
    /**
     * Submits the ShortAnswer Activity for grading.
     * @param iframe_agent 
     * @returns 
     */
    export function submit_textbox (iframe_agent: IframeAgent): Promise<void> {
        // /ContentViewers/OnlineContent/SubmitAttempt
        return iframe_agent.evaluate(`
            const btn =  $("#SubmitQuestionsButton");
            btn.removeAttr("disabled").removeClass("disabled");
            btn.click();
        `);
    }
    /**
     * Edgenuity code to determine if CKEditor is enabled.
     * @returns 
     */
    export function textbox_enabled () {
        return !!($("#WYSIWYGEnabled").val() == "True");
    }
    export function is_shortanswer_activity (iframe: HTMLIFrameElement): boolean {
        throw new Error("Not implemented.");
        return false;
    }
}