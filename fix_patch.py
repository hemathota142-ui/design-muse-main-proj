from pathlib import Path
path = Path('src/components/chat/ChatBot.tsx')
text = path.read_text()
old = "    } catch (streamError) {\r\n      console.error(\"Gemini stream failed\", streamError);\r\n      const errorText = \"Gemini AI is temporarily unavailable. Please try again.\";\r\n      setErrorMessage(errorText);\r\n      updateAssistantMessage(assistantId, errorText);\r\n    } finally {"
new = "    } catch (streamError) {\r\n      const message =\r\n        streamError instanceof Error\r\n          ? streamError.message\r\n          : \"Gemini AI is temporarily unavailable. Please try again.\";\r\n      console.error(\"chatbot stream error\", { prompt: trimmedText, message, error: streamError });\r\n      setErrorMessage(message);\r\n      updateAssistantMessage(assistantId, message);\r\n    } finally {"
if old not in text:
    raise SystemExit('pattern missing')
path.write_text(text.replace(old, new, 1))
