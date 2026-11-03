"""What a style is: a named character, or a shape in a colour, wearing an expression."""

from typing import Literal, Self
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.base import BaseSchema

Character = Literal["nexo", "vita", "cloe", "malu", "yoshi", "fred"]
Shape = Literal[
    "circle",
    "pebble",
    "squircle",
    "capsule",
    "triangle",
    "hexagon",
    "cloud",
    "droplet",
    "square",
    "diamond",
    "pentagon",
]
Expression = Literal[
    "own",
    "neutral",
    "attentive",
    "surprised",
    "excited",
    "happy",
    "laughing",
    "angry",
    "sad",
    "scared",
    "suspicious",
    "confused",
    "curious",
    "proud",
    "shy",
    "unimpressed",
    "sleepy",
]

AvatarState = Literal["idle", "notification", "asleep", "failed"]
"""What the agent is doing, as the avatar draws it. `thinking` is the console's
own to decide - it knows a turn is in flight - so the server never answers it."""

EYE_SIZE_MIN = 0.7
EYE_SIZE_MAX = 1.6
"""The studio's eye-size slider, end to end; the console clamps to the same range."""

LOOKUP_LIMIT = 200
"""How many agents one lookup may ask about: more than any page draws at once."""


class AvatarStyle(BaseSchema):
    """One agent's avatar.

    A character keeps its own shape and colour; picking a shape instead draws
    that shape, tinted with `colour`. Exactly one of the two, so a stored style
    never has to decide which of them it meant.
    """

    character: Character | None = Field(default=None, description="A named character, or null")
    shape: Shape | None = Field(
        default=None, description="A body shape, when no character is chosen"
    )
    colour: int | None = Field(
        default=None, ge=0, le=11, description="Swatch 0..11 tinting a shape; null for the default"
    )
    expression: Expression = Field(
        default="own", description="The face; `own` is the character's or the shape's default"
    )
    eye_size: float = Field(
        default=1.0,
        ge=EYE_SIZE_MIN,
        le=EYE_SIZE_MAX,
        description="The eyes' scale; a style stored before the slider existed reads as 1",
    )

    @model_validator(mode="after")
    def _one_body(self) -> Self:
        if (self.character is None) == (self.shape is None):
            raise ValueError("Choose a character or a shape, not both and not neither")
        if self.character is not None and self.colour is not None:
            raise ValueError("A character keeps its own colour; pick a shape to tint it")
        return self


class AvatarStyleRead(BaseSchema):
    agent_id: UUID
    style: AvatarStyle


class AvatarLookupRequest(BaseSchema):
    agent_ids: list[UUID] = Field(min_length=1, max_length=LOOKUP_LIMIT)


class AvatarLookupRead(BaseSchema):
    """For the agents the caller may see: the styles of those that have one, and every one's state."""

    styles: dict[UUID, AvatarStyle]
    states: dict[UUID, AvatarState] = Field(default_factory=dict)
