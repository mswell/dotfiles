export default function listGoogleModels(pi) {
    pi.registerCommand("list-models", {
        description: "List google models",
        handler: async (args, ctx) => {
            const models = ctx.modelRegistry.list().filter(m => m.provider === "google");
            ctx.ui.notify("Models: " + models.map(m => m.id).join(", "), "info");
        }
    });
}
