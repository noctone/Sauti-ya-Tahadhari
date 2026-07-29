import os
from ai.providers.base import LLMProvider

DEFAULT_MODEL = "gpt-4o"


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str = None, model: str = None):
        try:
            from openai import OpenAI
        except ImportError as e:
            raise ImportError(
                "OpenAIProvider requires the 'openai' package. "
                "Run: pip install openai"
            ) from e

        resolved_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not resolved_key:
            raise EnvironmentError(
                "OPENAI_API_KEY not set. Developer action required: "
                "set it before selecting LLM_PROVIDER=openai."
            )

        self.client = OpenAI(api_key=resolved_key)
        self.model = model or DEFAULT_MODEL

    def generate(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content.strip()
