import os
from ai.providers.base import LLMProvider

DEFAULT_MODEL = "claude-sonnet-4-6"


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = None):
        try:
            import anthropic
        except ImportError as e:
            raise ImportError(
                "AnthropicProvider requires the 'anthropic' package. "
                "Run: pip install anthropic"
            ) from e

        resolved_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not resolved_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY not set. Developer action required: "
                "set it before selecting LLM_PROVIDER=anthropic."
            )

        self.client = anthropic.Anthropic(api_key=resolved_key)
        self.model = model or DEFAULT_MODEL

    def generate(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ).strip()
