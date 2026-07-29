"""
Provider interface. The rest of the application (pipeline.py) depends
ONLY on this abstract interface, never on a specific vendor SDK.
Swapping providers = changing the LLM_PROVIDER env var, nothing else.
"""
from abc import ABC, abstractmethod


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000) -> str:
        """
        Send a system + user prompt to the underlying model and return
        the raw text response. Implementations are responsible for
        translating this generic call into their SDK's specific shape.
        Must raise a clear exception (not silently return empty string)
        if the call fails.
        """
        raise NotImplementedError
