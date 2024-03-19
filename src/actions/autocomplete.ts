import { autocomplete, autocomplete_ls_enabled, disable_ls_autocomplete, enable_ls_autocomplete } from "../activities/general";
import { AppContext } from "../app";
export function attach_autocomplete_to_app (ctx: AppContext) {
    /* Make sure autocomplete isn't running when used. */
    let autocomplete_busy = false;
    let attempt_autocomplete = async () => {
        if (autocomplete_busy === false) {
            autocomplete_busy = true;
            await autocomplete(ctx);
            autocomplete_busy = false;
        }
    }

    /* Autocomplete button. */
    const btn = ctx.app.querySelector("#autocomplete-button");
    if (!(btn instanceof HTMLButtonElement)) throw new Error("Failed to find autocomplete button.");
    btn.addEventListener("click", async () => {
        await attempt_autocomplete()
    });

    /* Autocomplete switch. */
    const switch_btn = ctx.app.querySelector("#autocomplete-switch");
    if (!(switch_btn instanceof HTMLInputElement)) throw new Error("Failed to find autocomplete switch.");
    switch_btn.checked = autocomplete_ls_enabled();
    if (switch_btn.checked === true) attempt_autocomplete();
    switch_btn.addEventListener("click", async () => {
        if (switch_btn.checked) {
            enable_ls_autocomplete();
            await attempt_autocomplete();
        }
        else disable_ls_autocomplete();
    });
}