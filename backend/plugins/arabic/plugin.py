"""Arabic as a console language, and the text the server writes in it.

The console's own strings are the frontend half's (`frontend/src/plugins/arabic/`).
This half makes `ar` a language a person may choose (`ConsoleLocale`), tells an
agent the person reads Arabic, and translates the few sentences the backend
writes itself: the welcome direct message, the morning briefing and the line a
voice preview speaks.
"""

from app.core.plugins import BackendPlugin

PLUGIN = BackendPlugin(
    id="arabic",
    locales=("ar",),
    language_names={"ar": "Arabic"},
    strings={
        "voice.preview": {
            "ar": "مرحبًا، هكذا يبدو صوتي. اسألني عن أي شيء، وسأجيبك بصوت مسموع.",
        },
        "proactive.briefing.heading": {
            "ar": "جديد من متابعاتك ({count}):",
        },
        "proactive.briefing.more": {
            "ar": "…و{count} أخرى.",
        },
        "proactive.briefing.open": {
            "ar": "تجد كل ذلك في صندوق الوارد: {url}",
        },
        "proactive.welcome.greeting": {
            "ar": (
                "أهلًا بك في {organization}! أنا {bot}، مساعد الذكاء الاصطناعي هنا. اسألني عن "
                "أي شيء مباشرةً في هذه المحادثة - أو افتح لوحة التحكم: {url}"
            ),
        },
    },
)
