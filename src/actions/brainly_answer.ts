import { log } from "../tampermonkey_util";
import { AppContext } from "../app";
function get_brainly_answers (question: string): string[] {
    log("Opening iframe...");
    log("Waiting for iframe to recognize parent...");
    log("Fetching answers from iframe...");
    log("Listing best 3 answers...");
    return ["Not implemented."];
}
export function attach_brainly_to_app (app: HTMLElement, payload: AppContext) {
    log("mow! uwu");
    const button = app.querySelector("#brainly-button");
    if (button === null) throw new Error("Failed to find button to attach to.");
    // test activity type here?
    function onclick () {
        log("Brainly answer requested!");
        /*let question: string = get_question();
        let answers: string[] = get_brainly_answers(question);
        if (answers.length > 0) log(answers.join("\n"));
        else log("no answers found")*/
    }
    button.addEventListener("click", onclick);
}