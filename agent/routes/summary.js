import express from "express";
import { summarizeText } from "../services/gemini.js";

const router = express.Router();

//=========================
// ROUTES
//=========================
/**
 * This route receives a POST request with a lesson text in the body.
 * It uses the summarizeText function to generate a summary of the lesson.
 * The summary is then sent back in the response 
 */
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