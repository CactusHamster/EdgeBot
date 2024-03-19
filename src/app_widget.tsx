import { JSX } from "./jsx"
export const CSS: string = `
/* Break to a new flexbox row. Only works with flex-wrap: wrap. */
.flexbreak {
    height: 0px;
    flex-basis: 100%;
}
/* Can't select button text :3 */
button {
    user-select: none;
}
/* Switch */
input[type=checkbox].switch { display: none; }
label.switch {
    cursor: pointer;
    width: 40px;
    height: 20px;
    background: rgba(0, 0, 0, 0.3);
    display: block;
    border-radius: 20px;
    position: relative;
}
label.switch:after {
    content: '';
    position: absolute;
    top: 5px;
    left: 5px;
    width: 10px;
    height: 10px;
    background: #fff;
    border-radius: 10px;
    transition: 0.3s;
    background: #fff;
    border-radius: 5px;
    transition: 0.3s;
}
input.switch:checked + label { background: #362580; }
input.switch:checked + label.switch:after {
    left: calc(100% - 5px);
    transform: translateX(-100%);
}
label.switch:active:after {
    width: 10px;
}

.widget {
    display: flex;
    flex-direction: column;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    /* Widget size. */
    min-width: 300px;
    max-width: 600px;
    min-height: 40vh;
    /* Border/shadow */
    box-shadow: 0 0 0 1px black;
    border-radius: 4px;
    will-change: top, left, width, height;
    /* Widget positioning */
    position: fixed;
    z-index: 1000;
    /* Colors */
    background-color: #444;
    color: white;
    /* Hopefully prevent being squished against side of page. */
    overflow: hidden;
}
.spacer {
    flex-grow: 1;
}
.header {
    user-select: none;
    display: flex;
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
    background-color: rgba(0, 0, 0, 0.1);
    cursor: move;
}
.header > .title {
    font-size: medium;
    margin-left: 12px;
}
.header > .icon {
    cursor: pointer;
    margin-left: 8px;
    margin-right: 8px;
}
.content {
    margin-top: 12px;
    margin-left: 12px;
    margin-right: 12px;
    margin-bottom: 24px;
    width: calc(100% - 24px);
}
.component {
    margin-top: 20px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}
/* Text inputs */
.component input[type=text] {
    flex: 1;
    color: lightgray;
    background-color: transparent;
    border-style: none;
    border-bottom: 2px solid gray;
}
.component input[type=text]::placeholder {
    color: gray;
    opacity: 0.5;
}
/* Buttons */
.component input[type=button], .component button {
    color: white;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    border-style: none;
    padding: 6px;
}
.component input[type=button]:hover, .component button:hover {
    background: darkgray;
    cursor: pointer;
}
/* Logs from individual commands. */
.component .op-output {
    margin-top: 10px;
    padding: 0px;

    width: 100%;
    height: auto;

    white-space: pre-wrap;
    word-wrap: break-word;
}
.component .autocomplete-switch-label {
    margin-left: 6px;
}
`.replaceAll(/ +/g, " ");

export const gen_app_html = () => <div class="widget">
<div class="header">
    <h3 class="title">Edgebot</h3>
    <div class="spacer"></div>
    <div class="icon">
        <svg _is_svg="true" overflow="visible" width="24" height="24" xmlns="http://www.w3.org/2000/svg" version="1.1">
            <circle _is_svg="true" overflow="visible" cx="12" cy="12" r="12" fill-opacity=".075"></circle>
            <rect _is_svg="true" overflow="visible" x="4.5" y="10.5" width="15" height="3" fill="#fff"></rect>
        </svg>
    </div>
</div>
<div class="content">
    {/*}
    <div class="component">
        <button id="chatgpt-button">ChatGPT Answer</button>
        <div class="op-output" id="chatgpt-output"></div>
    </div>
    <div class="component">
        <button id="brainly-button">Brainly Answer</button>
        <div class="op-output" id="brainly-output"></div>
    </div>
    <div class="component">
        <button id="skip-video-button">Skip video</button>
        <div class="op-output"></div>
    </div>
    <div class="component">
        <button id="do-the-vocab">do the vocab thing</button>
        <div class="op-output"></div>
    </div>
    <div class="component">
        <button id="do-the-textbox">do the textbox thing</button>
        <div class="op-output"></div>
    </div>
    {*/}
    <div class="component">
        <button id="autocomplete-button">Autocomplete</button>
        <div class="op-output"></div>
    </div>
    <div class="component">
        <input class="switch" id="autocomplete-switch" type="checkbox" />
        <label class="switch" for="autocomplete-switch"></label>
        <label for="autocomplete-switch" class="autocomplete-switch-label">Automate</label>
    </div>
</div>
</div>