"""
Single point of provider selection. Change LLM_PROVIDER and nothing
else in the codebase needs to change.
"""
import os


def get_provider():
    """
    Reads LLM_PROVIDER env var (default: 'anthropic'), optionally
    LLM_MODEL to override that provider's default model, and returns
    a ready-to-use LLMProvider instance.
    """
    name = os.environ.get("LLM_PROVIDER", "anthropic").strip().lower()
    model_override = os.environ.get("LLM_MODEL")  # optional, applies to whichever provider is selected

    if name == "anthropic":
        from ai.providers.anthropic_provider import AnthropicProvider
        return AnthropicProvider(model=model_override)
    elif name == "gemini":
        from ai.providers.gemini_provider import GeminiProvider
        return GeminiProvider(model=model_override)
    elif name == "openai":
        from ai.providers.openai_provider import OpenAIProvider
        return OpenAIProvider(model=model_override)
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER='{name}'. Valid options: anthropic, gemini, openai."
        )
