import { AppContext } from "../app";
import { GptResponse } from "../external/chatgpt/api_types";
import { IframeAgent } from "../external/iframe/iframe_agent";
import { doc, log, win } from "../tampermonkey_util";

export interface WrittenQuestion {
    text: string;
    online_content?: string[];
}
export enum AssignmentType {
    Unknown,
    Vocabulary,
    Video,
    OnlineContent,
    Journal,
    PracticeQuiz,
    Quiz,
    UnitTestReview,
    UnitTest,
}
export type WrittenAssignmentType = AssignmentType.OnlineContent | AssignmentType.Journal;

/**
 * Returns activity iframe.
 * @returns 
 */
export function find_activity_iframe (): HTMLIFrameElement | null {
    const IFRAME_ID = "stageFrame";
    const iframe = doc.getElementById(IFRAME_ID);
    if (!(iframe instanceof HTMLIFrameElement)) return null;
    else return iframe;
}
/**
 * Completes an assignment automatically. May not be supported on all assignments.
 * @param ctx 
 * @returns 
 */
export async function autocomplete (ctx: AppContext): Promise<void> {
    console.log("Beginning autocomplete.");
    // Check if assignment is locked.
    if (assignment_locked()) {
        console.log("Assignment is locked. Disabling autocomplete.");
        if (autocomplete_ls_enabled()) disable_ls_autocomplete(ctx);
        return void(0);
        /* UNREACHED */
    }
    // Give the user some time to turn it off before starting.
    if (autocomplete_ls_enabled()) {
        console.log("Delaying so you can cancel if necessary.");
        await new Promise(r => setTimeout(r, 3 * 1000));
        if (!autocomplete_ls_enabled()) {
            return void(0);
            /* UNREACHED */
        }
        console.log("Delay finished.");
    }
    // Check if assignment is finished already.
    if (assignment_finished()) {
        console.log("Assignment is finished. Beginning next assignment.");
        next_assignment();
        return void(0);
        /* UNREACHED */
    }
    // Actual autocomplete functionality~!
    let assignment_type: AssignmentType = check_assignment_type();
    switch (assignment_type) {
        case AssignmentType.OnlineContent:
        case AssignmentType.Journal:
            // Answer with ChatGPT.
            let question = await get_written_prompt(ctx, assignment_type);
            let gpt_callback = ({ message }: GptResponse) => console.log(message.content.parts[0]);
            let gpt_question = "Respond in 3 sentences. " + question;
            let answer = await ctx.gpt.answer(gpt_question, gpt_callback);
            await set_written_text(ctx, answer);
            // Give the user some time to turn off the switch before autosubmitting.
            if (autocomplete_ls_enabled()) {
                await new Promise(r => setTimeout(r, 3 * 1000));
                await submit_written_assignment(ctx);
                next_assignment();
            }
        break;
        case AssignmentType.PracticeQuiz:
        case AssignmentType.UnitTestReview:
            do {
                await new Promise(r => setTimeout(r, 3 * 1000));
                //@TODO: Wait for question to load before starting.
                //       Better yet, force all questions to load.
                //       Or load them ot an array and answer them invisibly, then submit all at once.
                await complete_current_practice_quiz_question(ctx);
                await new Promise(r => setTimeout(r, 0.5 * 1000));
            } while (await practice_quiz_next_unfinished_question(ctx));
            if (autocomplete_ls_enabled()) {
                await submit_practice_quiz(ctx)
                next_assignment();
            }
        break;
        case AssignmentType.Video:
            throw new Error("Unimplemented.");
            /* UNREACHED */
        break;
        case AssignmentType.Vocabulary:
            throw new Error("Unimplemented.");
            /* UNREACHED */
        break;
        case AssignmentType.Quiz:
            if (autocomplete_ls_enabled() && !quiz_started()) await start_quiz(ctx);
            console.log("Processing Quiz...")
            do {
                await new Promise(r => setTimeout(r, 3 * 1000));
                if (await current_quiz_question_locked(ctx)) continue;
                await complete_current_practice_quiz_question(ctx);
            } while (await practice_quiz_next_unfinished_question(ctx));

        break;
        default:
            throw new Error(`Unrecognized assignment type: ${assignment_type}.`);
            /* UNREACHED */
        break;
    }
}
/**
 * Returns true if the current assignment is finished and submitted.
 */
export function assignment_finished (): boolean {
    const status_label = document.getElementById("activity-status");
    if (status_label === null) throw new Error("Failed to find Activity Status h2.")
    let { innerText: text } = status_label;
    text = text.toLowerCase();
    if (text === "complete") return true;
    else return false;
    // else throw new Error(`Unexpected activity status '${text}'.`);
}
/**
 * Returns true if the assignment requires teacher approval.
 */
export function assignment_locked (): boolean {
    //@TODO: implement this :3
    return false;
    
}
/**
 * localStorage key for autocomplete.
 */
const AUTOCOMPLETE_KEY = "poggers_autocomplete";
/**
 * Returns true if autocomplete is enabled in localStorage.
 */
export function autocomplete_ls_enabled (): boolean {
    return localStorage.getItem(AUTOCOMPLETE_KEY) === "true";
}
/**
 * Turns on autocomplete in localStorage.
 */
export function enable_ls_autocomplete (ctx?: AppContext): void {
    localStorage.setItem(AUTOCOMPLETE_KEY, "true");
    // Turn on the switch if possible.
    if (typeof ctx !== "undefined") {
        const switch_btn = ctx.app.querySelector("#autocomplete-switch");
        if (switch_btn instanceof HTMLInputElement && switch_btn.checked === false) switch_btn.checked = true;
    }
    return void(0);
}
/**
 * Turns off autocomplete in localStorage.
 */
export function disable_ls_autocomplete (ctx?: AppContext): void {
    localStorage.setItem(AUTOCOMPLETE_KEY, "false");
    // Turn off the switch if possible.
    if (typeof ctx !== "undefined") {
        const switch_btn = ctx.app.querySelector("#autocomplete-switch");
        if (switch_btn instanceof HTMLInputElement && switch_btn.checked === true) switch_btn.checked = false;
    }
    return void(0);
}
/**
 * Returns the assignment type enum.
 */
export function check_assignment_type (): AssignmentType {
    // Check the assignment title text.
    const title = win.document.getElementById("activity-title");
    if (title === null) return AssignmentType.Unknown;
    switch (title.innerText.toLowerCase()) {
        case "journal activity":
            return AssignmentType.Journal;
            /* UNREACHED */
        case "practice":
            return AssignmentType.PracticeQuiz;
            /* UNREACHED */
        case "quiz":
            return AssignmentType.Quiz;
        case "unit test review":
            return AssignmentType.UnitTestReview;
        case "unit test":
            return AssignmentType.UnitTest;
        default:
            return AssignmentType.Unknown;
            /* UNREACHED */
        break;
    }
}
/**
 * Returns the prompt of a written assignment.
 */
export async function get_written_prompt (ctx: AppContext): Promise<WrittenQuestion>
export async function get_written_prompt (ctx: AppContext, type?: AssignmentType): Promise<WrittenQuestion>;
export async function get_written_prompt (ctx: AppContext, type?: AssignmentType): Promise<WrittenQuestion> {
    if (typeof type === "undefined") type = check_assignment_type();
    console.log(`Fetching written prompt...`);
    if (type === AssignmentType.Journal) {
        return await ctx.activity_iframe_agent.evaluate(` return document.getElementById("journal-prompt").innerText; `);
    } else if (type == AssignmentType.OnlineContent) {
        return await ctx.activity_iframe_agent.evaluate(`
            let question = null;
            const parent = unsafeWindow.document.querySelector("#contentViewer");
            if (parent === null) throw new Error("Failed to find content viewer.");
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
    } else {
        throw new Error(`Invalid assignment type ${type}. Expected Journal or OnlineContent type.`);
    }
}
/**
 * Writes text into the current textbot assignment.
 * @param ctx 
 * @param text 
 * @param type 
 */
export async function set_written_text (ctx: AppContext, text: string, type?: AssignmentType): Promise<void> {
    if (type === undefined) type = check_assignment_type();
    console.log("Setting written assignment text...");
    switch (type) {
        case AssignmentType.Journal:
        case AssignmentType.OnlineContent:
            await ctx.activity_iframe_agent.evaluate(`
                for (let instance_name in CKEDITOR.instances) {
                    let editor = CKEDITOR.instances[instance_name];
                    editor.setData('<p>${escape(text)}</p>');
                }
            `);
        break;
        default:
            throw new Error(`Invalid assignment type ${type}. Expected Journal or OnlineContent type.`);
        break;
    }
}

/**
 * Clicks the big blue Submit button.
 * @param ctx 
 * @returns 
 */
export async function submit_written_assignment (ctx: AppContext): Promise<void> {
    console.log("Submitting assignment.");
    await ctx.activity_iframe_agent.evaluate(`
        const button = document.getElementById("SubmitButton");
        button.click();
    `);
    return void(0);
}
/**
 * Clicks the Next Activity button.
 * @returns 
 */
export function next_assignment (): void {
    const btn = document.querySelector(".footnav.goRight");
    if (!(btn instanceof HTMLElement)) throw new Error("Failed to find next activity button.");
    btn.click();
    return void(0);
}

/**
 * Returns true if assignment is OnlineContent or Journal activity.
 */
export function is_written (): boolean;
export function is_written (type: AssignmentType): boolean;
export function is_written (type?: AssignmentType) {
    return type === AssignmentType.OnlineContent || type === AssignmentType.Journal;
}

export function escape (string: string) {
    return string
        .replaceAll( "'",   "\\'"  )
        .replaceAll( '"',   '\\"'  )
        .replaceAll( `\${`, '\\${' )
        .replaceAll( '\n',  '\\n'  )
        .replaceAll( '\r',  '\\r'  )
}

export function alphabetic (string: string) {
    return string.split("").filter(c => {
        let code = c.codePointAt(0);
        if (typeof code === "undefined") return false;
        if ((code < 97 || code > 122) && (code < 65 || code > 90)) return false;
        return true;
    }).join("");
}

export function get_quiz_question_id (ctx: AppContext): Promise<string> {
    return ctx.activity_iframe_agent.evaluate(`
        let list = Array.from(document.getElementById("navBtnList").children).filter(child => child.style.display !== "none");
        let currently_selected = list.find(c => c.children[0].matches(".plainbtn.alt.icon.yellow.selected"));
        if (typeof currently_selected !== "undefined") return currently_selected.id;
        let question_container = document.querySelector(".question-container");
        if (question_container === null) throw new Error("Failed to find question container.");
        return Array.from(question_container.children).find(child => child.display !== "none").id.slice(2)
    `);
}
/**
 * Complete the current question of the practice quiz.
 * @param ctx 
 */
export async function complete_current_practice_quiz_question (ctx: AppContext): Promise<void> {
    interface Choice {
        letter: string,
        text: string,
    }
    enum PracticeQuizQuestionType {
        Text,
        MultipleChoice,
        TrueFalse,
        Unknown
    }
    interface PracticeQuizQuestion {
        text: string,
        kind: PracticeQuizQuestionType,
        choices?: Choice[],
    }
    interface MultipleChoicePracticeQuizQuestion extends PracticeQuizQuestion {
        text: string,
        kind: PracticeQuizQuestionType.MultipleChoice,
        choices: Choice[]
    }
    interface WrittenPracticeQuizQuestion extends PracticeQuizQuestion {
        text: string,
        kind: PracticeQuizQuestionType.Text
    }
    /**
     * QuestionID of the current Question.
     */
    let q_id = await get_quiz_question_id(ctx);
    /**
     * Parsed activity question.
     */
    const question_obj: PracticeQuizQuestion = await ctx.activity_iframe_agent.evaluate(`
        // Find the shown question itself from the list of hidden questions.
        const question_container = document.querySelector(".question-container");
        if (question_container === null) throw new Error("Failed to find question container.")
        const form = question_container.querySelector("#q_${q_id}");
        if (form === null) throw new Error("Failed to find question form.");
        const contents = form.querySelector(".Assessment_Main_Body_Content_Question > .Question_Contents");
        if (contents === null) throw new Error("Failed to find question contents.");

        let question_div = contents.children[0];
        let answer_div = contents.children[contents.children.length - 1];
        
        let kind = (function () {
            if (question_div.querySelector("table") !== null) return ${PracticeQuizQuestionType.MultipleChoice};
            else if (answer_div.children[0] instanceof HTMLTextAreaElement) return ${PracticeQuizQuestionType.Text};
            else if (answer_div.children[0].className === 'answer-choice') return ${PracticeQuizQuestionType.TrueFalse};
            else return ${PracticeQuizQuestionType.Unknown};
        })();

        let bold = question_div.querySelector("div > span > b");
        if (bold === null) bold = question_div.querySelector("div > strong");
        if (bold === null) throw new Error("Failed to find bold question element.");
        let text = bold.innerText;

        let choices = void(0);
        if (kind === ${PracticeQuizQuestionType.MultipleChoice}) {
            const choice_items = Array.from(question_div.querySelectorAll("table > tbody > tr"));
            choices = [];
            for (let i = 0; i < choice_items.length; i++) {
                const tr = choice_items[i];
                let choice_letter = tr.children[0].children[0]?.innerText;
                let choice_text = tr.children[1].children[0]?.innerText;
                if (typeof choice_letter !== "undefined" && typeof choice_text !== "undefined") {
                    choices.push({ letter: choice_letter.trim().charAt(0).toUpperCase(), text: choice_text });
                }
            };
        };
        return { kind, text, choices };
    `);
    console.log(question_obj);
    if (question_obj.kind === PracticeQuizQuestionType.Text) {
        function write (text: string) {
            return ctx.activity_iframe_agent.evaluate(`
                const question_container = document.querySelector(".question-container");
                if (question_container === null) throw new Error("Failed to find question container.")
                const form = question_container.querySelector("#q_${q_id}");
                if (form === null) throw new Error("Failed to find question form.");
                const contents = form.querySelector(".Assessment_Main_Body_Content_Question > .Question_Contents");
                if (contents === null) throw new Error("Failed to find question contents.");

                let answer_div = contents.children[contents.children.length - 1];
                answer_div.children[0].value = '${escape(text)}';
            `);
        }
        const answer: string = await ctx.gpt.answer("Answer in a couple sentences. " + question_obj.text, ({message}) => write(message.content.parts[0]));
        await write(answer);
    }
    else if (question_obj.kind === PracticeQuizQuestionType.MultipleChoice) {
        if (typeof question_obj.choices === "undefined") throw new Error("No choices found.");
        const question = question_obj.text + "\n" +
        question_obj.choices.map(choice => `**${choice.letter}.** ${choice.text}`).join("\n") + "\n" +
        "\n" +
        "Please provide your response in the format: '**Z**' where Z is the letter of the correct answer.";
        const response = await ctx.gpt.answer(question);
        const letters = question_obj.choices.map(choice => choice.letter);
        let match: RegExpMatchArray | null = response.match(new RegExp(`\\*\\*[${letters.join("")}]\\*\\*`));
        if (match === null) match = response.match(new RegExp(`[${letters.join("")}]\\.(\\*| )`));
        if (match === null) throw new Error(`Failed to parse GPT response.\n\n${response}`);
        let answer = match[0].split("").find(l => letters.includes(l.charAt(0)));
        await ctx.activity_iframe_agent.evaluate(`
                const question_container = document.querySelector(".question-container");
                if (question_container === null) throw new Error("Failed to find question container.")
                const form = question_container.querySelector("#q_${q_id}");
                if (form === null) throw new Error("Failed to find question form.");
                const contents = form.querySelector(".Assessment_Main_Body_Content_Question > .Question_Contents");
                if (contents === null) throw new Error("Failed to find question contents.");
                const answer_div = contents.children[contents.children.length - 1];
                const to_click = answer_div.querySelector("#" + CSS.escape("${q_id}_0_${answer}"));
                if (to_click === null) throw new Error("Failed to find answer bubble to click.");
                to_click.click();
        `);
        console.log(`clicked ${answer}!`)
    }
    else if (question_obj.kind === PracticeQuizQuestionType.TrueFalse) {
        const question = "True or False?\n" + question_obj.text;
        const response = await ctx.gpt.answer(question);
        let split = response.split(".").map(s => alphabetic(s.toLowerCase()));
        let answer = split.find(s => s === "true" || s === "false");
        if (typeof answer === "undefined") throw new Error("Failed to parse GPT response.");
        let letter = answer.toUpperCase().charAt(0).toUpperCase();
        await ctx.activity_iframe_agent.evaluate(`
                const question_container = document.querySelector(".question-container");
                if (question_container === null) throw new Error("Failed to find question container.");
                const form = question_container.querySelector("#q_${q_id}");
                if (form === null) throw new Error("Failed to find question form.");
                const contents = form.querySelector(".Assessment_Main_Body_Content_Question > .Question_Contents");
                if (contents === null) throw new Error("Failed to find question contents.");
                const answer_div = contents.children[contents.children.length - 1];
                const to_click = answer_div.querySelector("#" + CSS.escape("${q_id}_0_${letter}"));
                if (to_click === null) throw new Error("Failed to find answer bubble to click.");
                to_click.click();
        `);
        console.log(`clicked ${answer} owo`)
    }
    else {
        throw new Error("Unimplemented question type.");
    }
}
/**
 * Clicks the next unfinished question in the current Practice Quiz.
 * Returns true if an unfinished question was found.
 * @param ctx 
 * @returns 
 */
export async function practice_quiz_next_unfinished_question (ctx: AppContext): Promise<boolean> {
    return await ctx.activity_iframe_agent.evaluate(`
        let btn_list_ol = document.getElementById("navBtnList");
        if (btn_list_ol === null) throw new Error("Failed to find quiz question picker.");
        let finished    = [];
        let unfinished  = [];
        let selected    = null;
        for (let btn of btn_list_ol.children) {
            if (btn.tagName !== "LI" || btn.querySelector("a > i.icon-arrow-lp") !== null) continue;
            let child = btn.children[0];
            if (child.matches(".plainbtn.alt.icon") === false) continue;
            if (child.classList.contains("yellow")) {
                if (child.classList.contains("selected")) selected = child; 
                else finished.push(child);
            }
            else {
                unfinished.push(child);
            }
        }
        if (unfinished.length > 0) {
            unfinished[0].click();
            return true;
        } else {
            return false;
        }
    `) === true;
}
export async function current_quiz_question_locked (ctx: AppContext): Promise<boolean> {
    let q_id = await get_quiz_question_id(ctx);
    return ctx.activity_iframe_agent.evaluate(`
        const qdiv = document.getElementById("q_" + ${q_id});
        return qdiv.querySelector(".Locked") !== null;
    `);
}

/**
 * Submit the current practice quiz.
 * @param ctx 
 * @returns 
 */
export async function submit_practice_quiz (ctx: AppContext): Promise<void> {
    return await ctx.activity_iframe_agent.evaluate(`
        const btn = document.getElementById("submit");
        if (btn === null) throw new Error("Failed to find submit button.");
        btn.click();
        await new Promise(r => setTimeout(r, 1 * 1000));
        const confirm_btn = document.querySelector(".uibtn.uibtn-blue.uibtn-med.submit");
        if (confirm_btn === null) throw new Error("Failed to find submission confirmation button.");
        if (confirm_btn !== null) {
            confirm_btn.click();
        }
    `);
}
/**
 * Returns true if the quiz assignment is not yet started.
 */
export function quiz_started (): boolean {
    const status_label = document.getElementById("activity-status");
    if (status_label === null) throw new Error("Failed to find Activity Status h2.")
    let { innerText: text } = status_label;
    text = text.toLowerCase();
    if (text === "not started") return false;
    else return true;
}
/**
 * Starts the current unstarted quiz.
 */
export async function start_quiz (ctx: AppContext): Promise<void> {
    await ctx.activity_iframe_agent.evaluate(`
        const btn = document.querySelector(".overlay-attempt.overlay-attempt-clickable");
        if (btn === null) throw new Error("Failed to find quiz start button.");
        btn.click();
    `);
}