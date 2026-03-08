from pathlib import Path
path = Path('src/components/chat/ChatBot.tsx')
text = path.read_text()
old = "    } catch (streamError) {\n      console.error(\"Gemini stream failed, trying normal response\", streamError);\n      try {\n        const prompt = buildGeminiPrompt(trimmedText, nextMessages, context);\n        const reply = await askGemini(prompt);\n        updateAssistantMessage(assistantId, reply);\n      } catch (finalError) {\n        console.error(\"Gemini failed, using fallback help response\", finalError);\n        setErrorMessage(\"AI is temporarily unavailable. Showing help-based response.\");\n        updateAssistantMessage(assistantId, getHelpResponse(trimmedText));\n      }\n    } catch (streamError) {"
new = "    } catch (streamError) {\n      console.error(\\\"Gemini stream failed\\\", streamError);\n      const errorText = \\\"Gemini AI is temporarily unavailable. Please try again.\\\";\n      setErrorMessage(errorText);\n      updateAssistantMessage(assistantId, errorText);\n    } catch (streamError) {"
if old not in text:
    raise SystemExit('pattern not found')
path.write_text(text.replace(old, new, 1))
