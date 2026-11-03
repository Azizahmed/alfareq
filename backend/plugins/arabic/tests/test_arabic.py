"""Arabic, as far as the server is concerned: a language a person may choose, and
the sentences the backend writes itself."""

import pytest
from pydantic import TypeAdapter, ValidationError

from app.agents.person_briefing import LANGUAGE_NAMES
from app.schemas.user import ConsoleLocale
from app.schemas.voice import VoicePreviewRequest
from app.services.proactive._briefing import HEADING, MORE, OPEN, _message
from app.services.proactive._welcome import GREETING
from app.services.voice.preview import PREVIEW_LINES

LOCALE = TypeAdapter(ConsoleLocale)


def test_arabic_is_a_console_language_beside_the_core_three() -> None:
    assert LOCALE.validate_python("ar") == "ar"
    assert LOCALE.json_schema()["enum"] == ["en", "pl", "de", "ar"]


def test_a_language_nobody_installed_is_still_refused() -> None:
    with pytest.raises(ValidationError, match="Choose one of"):
        LOCALE.validate_python("fa")


def test_a_voice_preview_may_be_asked_for_in_arabic() -> None:
    request = VoicePreviewRequest.model_validate({"voice": {}, "locale": "ar"})
    assert request.locale == "ar"
    assert PREVIEW_LINES["ar"].startswith("مرحبًا")


def test_an_agent_is_told_the_person_reads_arabic() -> None:
    assert LANGUAGE_NAMES["ar"] == "Arabic"


def test_every_server_written_sentence_has_an_arabic_version() -> None:
    for table in (HEADING, MORE, OPEN, GREETING):
        assert table["ar"]
        assert table["en"]


def test_the_morning_briefing_reads_in_arabic() -> None:
    titles = [f"finding {n}" for n in range(7)]
    message = _message("ar", titles, "https://alfareq.example/inbox")

    assert message.splitlines()[0] == "جديد من متابعاتك (7):"
    assert "…و2 أخرى." in message
    assert message.endswith("تجد كل ذلك في صندوق الوارد: https://alfareq.example/inbox")
