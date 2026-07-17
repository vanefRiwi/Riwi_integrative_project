import express from "express";
import { summarizeText } from "../services/gemini.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                error: "Text is required."
            });
        }

        const summary = await summarizeText(text);

        res.json({
            summary
        });

    } catch (error) {
        console.error("Summary error:", error);

        res.status(500).json({
            error: "Failed to generate summary."
        });
    }
});

export default router;