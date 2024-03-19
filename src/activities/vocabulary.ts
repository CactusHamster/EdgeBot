import { IframeAgent } from "../external/iframe/iframe_agent";
import { AppContext } from "../app";
/**
 * Finishes a page of a vocab assignment. Returns the next page button, or null if finished.
 */
//@TODO: Just click the next button until the submit button appears...
//       or just set everything to complete and run submit()
//@TODO: just do nothing if all the words were already completed :3 (check if it's already been submitted)
async function complete_vocab_assignment (iframe_agent: IframeAgent): Promise<HTMLElement | null> {
    await iframe_agent.evaluate(`
        const word_obj = viewModel.currentWord();
        const word = word_obj.word();
        console.log("Completing word " + word + ".");
        const input = unsafeWindow.document.querySelector(".word-textbox");
        // word_obj.nextButton()
        // word_obj.nextButton().click();
        
        // viewModel.submit();
        // "Type" the text.
        /*input.value = word;
        // Turn the input green.
        input.classList.remove("word-normal");
        input.classList.remove("word-incorrect");
        input.classList.add("word-correct");*/
        // Enable the TTS buttons.
        // word_obj.definitionButton().state(contentEngine.view.activity.StateEnum.Enabled);
        // word_obj.sentenceButton().state(contentEngine.view.activity.StateEnum.Enabled);

        // Simulate playing audio.
        // WordComplete
        // word_obj.complete(true);
        // word_obj.nextButton().state(contentEngine.view.activity.StateEnum.Enabled);
        // for (let i = 0; i < initialData.Words.length; i++) if (initialData.Words[i].Key == word.key) initialData.Words[i].Complete = word.complete();


        // Based on Edgenuity's WordComplete() function inside 'view.activity = { ... }'
        let queryString = "";
        if (ActivityKeys.version) queryString = 'Vocab/UpdateAttempt?attemptKey=' + ActivityKeys.resultKey + '&completedWordKey=' + word.key + '&enrollmentKey=' + ActivityKeys.enrollmentKey + '&version=' + ActivityKeys.version;
        else queryString = 'Vocab/UpdateAttempt?attemptKey=' + ActivityKeys.resultKey + '&completedWordKey=' + word.key + '&enrollmentKey=' + ActivityKeys.enrollmentKey;
        $.ajax({
            url: API.E2020.addresses.ContentEngineViewersPath + queryString,
            type: "POST",
            contentType: "application/json; charset=utf-8"
        });

        // Click 'next' if available, click 'submit' otherwise.
        let next_btn = word_obj.nextButton();
        if (next_btn.state().name === "hidden") {
            viewModel.submit();
        } else {
            viewModel.nextWord();
        }
        null;
    `);
    return null;
}
export function attach_vocab_to_app_debug (app: HTMLElement, { activity_iframe_agent, activity_iframe }: AppContext) {
    const button = app.querySelector("#do-the-vocab") as HTMLButtonElement;
    if (!activity_iframe || !activity_iframe_agent) button.onclick = (event) => alert("This doesn't look like an assignment...");
    else button.onclick = (event) => complete_vocab_assignment(activity_iframe_agent);
}