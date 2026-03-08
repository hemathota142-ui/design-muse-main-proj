from pathlib import Path
path = Path('src/components/chat/ChatBot.tsx')
text = path.read_text()
old = '    } catch (streamError) {\n      console.error("Gemini stream failed", streamError);\n      const errorText = "Gemini AI is temporarily unavailable. Please try again.";\n      setErrorMessage(errorText);\n      updateAssistantMessage(assistantId, errorText);\n    } catch (streamError) {'
new = '    } catch (streamError) {\n      const message =\n        streamError instanceof Error\n          ? streamError.message\n          : "Gemini AI is temporarily unavailable. Please try again.";\n      console.error("chatbot stream error", { prompt: trimmedText, message, error: streamError });\n      setErrorMessage(message);\n      updateAssistantMessage(assistantId, message);\n    } catch (streamError) {'
if old not in text:
    raise SystemExit('pattern missing')
path.write_text(text.replace(old, new, 1))
