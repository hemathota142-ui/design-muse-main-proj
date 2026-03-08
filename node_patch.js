const fs = require('fs');
const path = 'src/components/chat/ChatBot.tsx';
let text = fs.readFileSync(path, 'utf8');
const old = `    } catch (streamError) {
      console.error("Gemini stream failed, trying normal response", streamError);
      try {
        const prompt = buildGeminiPrompt(trimmedText, nextMessages, context);
        const reply = await askGemini(prompt);
        updateAssistantMessage(assistantId, reply);
      } catch (finalError) {
        console.error("Gemini failed, using fallback help response", finalError);
        setErrorMessage("AI is temporarily unavailable. Showing help-based response.");
        updateAssistantMessage(assistantId, getHelpResponse(trimmedText));
      }
    } catch (streamError) {`;
const neu = `    } catch (streamError) {
      console.error("Gemini stream failed", streamError);
      const errorText = "Gemini AI is temporarily unavailable. Please try again.";
      setErrorMessage(errorText);
      updateAssistantMessage(assistantId, errorText);
    } catch (streamError) {`;
if (!text.includes(old)) {
  throw new Error('pattern missing');
}
text = text.replace(old, neu);
fs.writeFileSync(path, text);
