from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class AgentConfig(BaseModel):
    name: str = Field(..., description="Unique name of the agent")
    description: str = Field(..., description="Capability description of the agent")
    model_name: str = Field("gemini-1.5-pro", description="Gemini AI model identifier")
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(2048, ge=1)
    extra_params: Dict[str, Any] = Field(default_factory=dict)
