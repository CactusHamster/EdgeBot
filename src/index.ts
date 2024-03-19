import { append_app_to_page } from "./app";
import { win} from "./tampermonkey_util";
import { handle_iframe } from "./external/iframe/iframe_inject";
import { handle_chatgpt } from "./external/chatgpt/chatgpt_inject";

;(function main (): void {
    if (is_in_iframe()) handle_iframe();
    else if (is_in_activity()) append_app_to_page();
    else if (is_in_chatgpt()) handle_chatgpt();
})();
/**
 * Returns true if in an iframe.
 */
function is_in_iframe (): boolean {
    return !!win.frameElement;
}
/**
 * Check if the app should be appended.
 * Avoids being put in likee... an iframe.
 */
function is_in_activity () {
    return win.location.toString().startsWith("https://r23.core.learn.edgenuity.com/player/");
}
/**
 * Returns true if script should be a worker to collect chatgpt conversations.
 */
function is_in_chatgpt (): boolean {
    if (win.location.hostname !== "chat.openai.com") return false;
    if (win.location.pathname !== "/" && !win.location.pathname.startsWith("/c/")) return false;
    return true;
}