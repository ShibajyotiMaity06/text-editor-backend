const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generateContent = async (req, res) => {
    try {
        const { prompt, context, type } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let fullPrompt = '';

        if (type === 'grammar') {
            fullPrompt = `Task: Fix grammar and spelling in the following text. Return ONLY the corrected text. Do not add any comments or quotes.\n\nText: ${context}`;
        } else if (type === 'autocomplete') {
            fullPrompt = `Task: Complete the following text naturally. Return ONLY the completion. Do not repeat the input text. Keep it concise (max 1-2 sentences).\n\nText: ${context}`;
        } else if (type === 'review') {
            fullPrompt = `Task: Review the following text and provide 3-5 bullet points on how to improve it (style, clarity, tone). Do not rewrite the text, just give advice.\n\nText: ${context}`;
        } else if (type === 'summarize') {
            fullPrompt = `Task: Summarize the following text in 3-5 concise bullet points.\n\nText: ${context}`;
        } else {

            fullPrompt = `Context: ${context}\n\nTask: ${prompt}\n\nIMPORTANT: Provide ONLY the direct response to the task. Do not include any conversational fillers like "Here is the text", "Sure", "I have updated", or "Below is the code". Do not use markdown code blocks unless specifically asked for code. Just give the raw content to be inserted.`;
        }

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ suggestion: text });
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ message: 'AI generation failed' });
    }
};
