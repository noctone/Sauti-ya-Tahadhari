import os
from ai.providers.base import LLMProvider

DEFAULT_MODEL = "gemini-2.5-flash"  # free-tier as of July 2026 — Pro-tier models are paid-only; override via LLM_MODEL if this changes


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = None):
        try:
            import google.generativeai as genai
        except ImportError as e:
            raise ImportError(
                "GeminiProvider requires the 'google-generativeai' package. "
                "Run: pip install google-generativeai"
            ) from e

        resolved_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not resolved_key:
            raise EnvironmentError(
                "GEMINI_API_KEY not set. Developer action required: "
                "set it before selecting LLM_PROVIDER=gemini."
            )

        genai.configure(api_key=resolved_key)
        self._genai = genai
        self.model_name = model or DEFAULT_MODEL

    def generate(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000) -> str:
        model = self._genai.GenerativeModel(
            self.model_name,
            system_instruction=system_prompt,
        )

        # Gemini's 2.5+/3.x models have "thinking" enabled by default, and those
        # internal reasoning tokens are deducted from the SAME max_output_tokens
        # budget as the visible answer — a small budget (e.g. 1000) can be entirely
        # consumed by thinking, truncating the actual JSON output mid-string.
        # Mitigation: give real headroom, and try to disable thinking outright if
        # this SDK version supports it (older google-generativeai versions may not).
        effective_max = max(max_tokens, 8192)
        generation_config = {"max_output_tokens": effective_max}

        try:
            generation_config["thinking_config"] = {"thinking_budget": 0}
            response = model.generate_content(user_prompt, generation_config=generation_config)
        except Exception:
            # Installed SDK version likely doesn't recognize thinking_config — retry without it.
            generation_config.pop("thinking_config", None)
            response = model.generate_content(user_prompt, generation_config=generation_config)

        if not response.candidates:
            raise RuntimeError(
                "Gemini returned no candidates at all — likely blocked by a safety filter "
                "or truncated before producing any output."
            )

        finish_reason = getattr(response.candidates[0], "finish_reason", None)
        if not response.text:
            raise RuntimeError(
                f"Gemini returned empty text (finish_reason={finish_reason}). "
                "This usually means thinking tokens consumed the entire budget — "
                "try a larger max_tokens or confirm thinking_config was accepted."
            )

        return response.text.strip()
