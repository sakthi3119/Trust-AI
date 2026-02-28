import httpx
import json
import re
from config import settings


SYSTEM_PROMPT = """You are TRUSTAI, an explainable AI assistant for smart campus life.
You help students with budget planning, activity recommendations, and campus event content.
Be concise and friendly. Always explain your reasoning in plain, natural language.
IMPORTANT: Never use markdown formatting. Do not use **, *, #, -, or any special symbols for formatting.
Write in plain prose. No bullet points. No bold text. No headers. No JSON in your reply.
"""


def _clean_text(text: str) -> str:
    """Strip markdown artifacts and leaked JSON/tags from LLM output."""
    # Remove <data>...</data> blocks (intent extraction leaking into reply)
    text = re.sub(r'<data>.*?</data>', '', text, flags=re.DOTALL)
    # Remove bold/italic markdown: **text** -> text, *text* -> text
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    # Remove markdown headers: ## heading -> heading
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove JSON-like blobs that may leak (lines starting with { or [{)
    text = re.sub(r'^\s*[\[{].*?[\]}]\s*$', '', text, flags=re.MULTILINE | re.DOTALL)
    # Remove markdown bullet dashes at line start
    text = re.sub(r'^\s*[-•]\s+', '', text, flags=re.MULTILINE)
    # Collapse 3+ blank lines to 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


async def chat_with_ollama(messages: list[dict], stream: bool = False) -> str:
    """Send messages to Ollama and return the assistant reply."""
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 512},
    }
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat", json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]
        except Exception as e:
            return f"[LLM Error] Could not reach Ollama: {str(e)}. Make sure Ollama is running with: ollama serve"


async def _clean_chat(messages: list[dict]) -> str:
    """Call Ollama and return cleaned plain-text response."""
    raw = await chat_with_ollama(messages)
    return _clean_text(raw)


async def extract_intent_and_data(user_message: str) -> dict:
    """Extract structured intent and data from free-form user message."""
    prompt = f"""Analyze this student message and extract:
1. intent (one of: budget_query, recommendation_request, planner_request, content_request, general_chat)
2. budget (float, if mentioned)
3. free_time_minutes (int, if mentioned)
4. preferences (list of strings)
5. location (string, if mentioned)
6. time_of_day (morning/afternoon/evening)

Message: "{user_message}"

Respond ONLY with a JSON object. Example:
{{"intent":"recommendation_request","budget":300,"free_time_minutes":180,"preferences":["cafe","music"],"location":"library block","time_of_day":"afternoon"}}
"""
    messages = [
        {"role": "system", "content": "You are a JSON extractor. Return only valid JSON, no explanation."},
        {"role": "user", "content": prompt},
    ]
    raw = await chat_with_ollama(messages)
    try:
        # Try to parse JSON from the response
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass
    return {"intent": "general_chat"}


async def generate_explanation(
    rec_name: str,
    score_breakdown: dict,
    rejected_alternatives: list[str],
) -> str:
    """Generate a natural language explanation for a recommendation."""
    top_factors = sorted(score_breakdown.items(), key=lambda x: x[1], reverse=True)[:3]
    factors_text = ", ".join(f"{k} ({v:.0f}%)" for k, v in top_factors)
    alts_text = ", ".join(rejected_alternatives[:3]) if rejected_alternatives else "none"

    prompt = f"""TRUSTAI recommended "{rec_name}" to a student.

Top scoring factors: {factors_text}
Alternatives ranked lower: {alts_text}

Write 2 to 3 plain sentences explaining why this was recommended. 
Use simple, friendly language. 
Do NOT use bullet points, dashes, bold text, asterisks, or any special formatting. 
Write only plain prose sentences."""
    messages = [
        {"role": "system", "content": "You are TRUSTAI, a friendly campus AI assistant. Respond in plain prose sentences only. No markdown, no bullet points, no asterisks, no special formatting."},
        {"role": "user", "content": prompt},
    ]
    return await _clean_chat(messages)


async def generate_club_content(
    event_type: str, tone: str, date: str = "", venue: str = "", extra: str = "",
    brand: dict = None,
) -> dict:
    """Generate Instagram caption, WhatsApp announcement and poster text."""
    brand_str = ""
    if brand and brand.get("club_name"):
        brand_str = f"\nClub/Brand: {brand['club_name']}"
        if brand.get("tagline"): brand_str += f" — {brand['tagline']}"
        if brand.get("signature_hashtags"): brand_str += f"\nSignature hashtags: {brand['signature_hashtags']}"
        if brand.get("emoji_style"): brand_str += f"\nEmoji style: {brand['emoji_style']}"

    prompt = f"""Create campus club social media content for:
Event: {event_type}
Tone: {tone}
Date: {date or 'TBD'}
Venue: {venue or 'Campus Grounds'}
Extra details: {extra or 'None'}{brand_str}

Return ONLY this JSON (no markdown, no extra text):
{{
  "instagram_caption": "...",
  "whatsapp_announcement": "...",
  "poster_text": "..."
}}

instagram_caption: 150-200 chars with relevant emojis and 3-5 hashtags
whatsapp_announcement: 3-4 sentences, clear and informative
poster_text: 4-6 punchy lines for a physical poster
"""
    messages = [
        {"role": "system", "content": "You are a creative campus social media manager. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]
    raw = await chat_with_ollama(messages)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass
    return {
        "instagram_caption": f"✨ Join us for an amazing {event_type}! Don't miss out! #{event_type.replace(' ','').lower()} #campuslife",
        "whatsapp_announcement": f"Hey everyone! 🎉 We're hosting a {event_type} on {date or 'soon'} at {venue or 'campus'}. {extra or ''} Mark your calendars!",
        "poster_text": f"{event_type.upper()}\nDate: {date or 'TBD'}\nVenue: {venue or 'Campus'}\n{extra or 'All are welcome!'}\n#CampusLife",
    }


async def generate_campaign(
    event_type: str, event_date: str, venue: str = "", extra: str = "", brand: dict = None
) -> dict:
    """Generate a 5-phase promotional campaign timeline for an event."""
    brand_str = ""
    if brand and brand.get("club_name"):
        brand_str = f"\nClub: {brand['club_name']}"
        if brand.get("tagline"): brand_str += f" | Tagline: {brand['tagline']}"
        if brand.get("signature_hashtags"): brand_str += f" | Hashtags: {brand['signature_hashtags']}"

    prompt = f"""Create a 5-phase social media campaign for this campus event:
Event: {event_type}
Date: {event_date}
Venue: {venue or 'Campus'}
Details: {extra or 'None'}{brand_str}

The 5 phases MUST be: Teaser, Hype Drop, Countdown, Day-Of, Post-Event

Return ONLY this JSON array (no markdown):
[
  {{
    "phase": "Teaser",
    "post_timing": "7-10 days before",
    "instagram": "mystery/intrigue caption with emojis, <120 chars",
    "whatsapp": "1-2 sentence curiosity teaser to group",
    "poster_line": "Short punchy tagline for teaser poster"
  }},
  {{
    "phase": "Hype Drop",
    "post_timing": "4-5 days before",
    "instagram": "reveal caption with excitement, <150 chars + hashtags",
    "whatsapp": "2-3 sentence full reveal announcement",
    "poster_line": "Main event headline + date"
  }},
  {{
    "phase": "Countdown",
    "post_timing": "1-2 days before",
    "instagram": "countdown caption with urgency, <120 chars",
    "whatsapp": "1-2 sentence last-call reminder with key details",
    "poster_line": "Countdown line e.g. 'Tomorrow! Are you ready?'"
  }},
  {{
    "phase": "Day-Of",
    "post_timing": "Morning of event",
    "instagram": "day-of hype caption, real-time energy, <120 chars",
    "whatsapp": "Short energetic 'It's happening today!' message",
    "poster_line": "Today's the day! venue + timing reminder"
  }},
  {{
    "phase": "Post-Event",
    "post_timing": "Within 24h after",
    "instagram": "grateful recap caption with emojis, <150 chars",
    "whatsapp": "2 sentence thank-you message to attendees",
    "poster_line": "Thank you tagline for post-event graphic"
  }}
]"""
    messages = [
        {"role": "system", "content": "You are a campus social media strategist. Return only valid JSON array."},
        {"role": "user", "content": prompt},
    ]
    raw = await chat_with_ollama(messages)
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            phases = json.loads(raw[start:end])
            return {"phases": phases}
    except Exception:
        pass
    # Fallback
    return {"phases": [
        {"phase": "Teaser", "post_timing": "7-10 days before",
         "instagram": f"👀 Something big is coming... #{event_type.replace(' ','').lower()}",
         "whatsapp": f"Something exciting is happening soon. Stay tuned! 🎯",
         "poster_line": "Coming Soon..."},
        {"phase": "Hype Drop", "post_timing": "4-5 days before",
         "instagram": f"🔥 {event_type.upper()} is HAPPENING! {event_date} at {venue or 'campus'}",
         "whatsapp": f"It's official! {event_type} on {event_date}. Don't miss it!",
         "poster_line": f"{event_type.upper()} — {event_date}"},
        {"phase": "Countdown", "post_timing": "1-2 days before",
         "instagram": f"⏰ Almost time! {event_type} is TOMORROW!",
         "whatsapp": f"Last reminder — {event_type} is tomorrow! Be there!",
         "poster_line": "Tomorrow — Be There!"},
        {"phase": "Day-Of", "post_timing": "Morning of event",
         "instagram": f"🚀 Today is the day! {event_type} starts NOW!",
         "whatsapp": f"Good morning! {event_type} is TODAY. See you there!",
         "poster_line": "It's Happening TODAY!"},
        {"phase": "Post-Event", "post_timing": "Within 24h after",
         "instagram": f"💫 What an incredible {event_type}! Thank you to everyone who came!",
         "whatsapp": f"Thank you all for the amazing energy at {event_type}! See you at the next one!",
         "poster_line": "Thank You! Until Next Time."},
    ]}


async def generate_caption_variants(
    event_type: str, date: str = "", venue: str = "", extra: str = "", brand: dict = None
) -> dict:
    """Generate 5 caption style variants for the same event."""
    brand_str = ""
    if brand and brand.get("club_name"):
        brand_str = f"\nClub: {brand['club_name']}"
        if brand.get("signature_hashtags"): brand_str += f" | Use these hashtags: {brand['signature_hashtags']}"

    prompt = f"""Write 5 Instagram caption variants for this campus event, each in a completely different writing style:

Event: {event_type}
Date: {date or 'TBD'}
Venue: {venue or 'Campus'}{brand_str}
Extra: {extra or 'None'}

Return ONLY this JSON array:
[
  {{
    "style": "hype",
    "label": "🔥 Hype Mode",
    "caption": "all-caps energy, multiple exclamation marks, fire emojis, max 120 chars + hashtags"
  }},
  {{
    "style": "minimal",
    "label": "🤍 Minimal Aesthetic",
    "caption": "clean lowercase, single emoji, one soft hashtag, poetic/aesthetic vibe, <100 chars"
  }},
  {{
    "style": "storytelling",
    "label": "📖 Storytelling Arc",
    "caption": "narrative hook, builds emotion, 2-3 sentences, feels personal, 150-180 chars"
  }},
  {{
    "style": "witty",
    "label": "😏 Witty & Meme",
    "caption": "clever wordplay or pop culture reference, relatable humor, <130 chars + hashtags"
  }},
  {{
    "style": "professional",
    "label": "💼 Professional",
    "caption": "formal tone, highlights value/learning, appropriate for LinkedIn too, <150 chars"
  }}
]"""
    messages = [
        {"role": "system", "content": "You are a creative social media copywriter. Return only valid JSON array."},
        {"role": "user", "content": prompt},
    ]
    raw = await chat_with_ollama(messages)
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            variants = json.loads(raw[start:end])
            return {"variants": variants}
    except Exception:
        pass
    return {"variants": [
        {"style": "hype", "label": "🔥 Hype Mode", "caption": f"IT'S HAPPENING!!! {event_type.upper()} 🔥🔥 Don't miss this! #{event_type.replace(' ','').lower()}"},
        {"style": "minimal", "label": "🤍 Minimal Aesthetic", "caption": f"something special is coming. {event_date if date else event_type.lower()} ✨"},
        {"style": "storytelling", "label": "📖 Storytelling Arc", "caption": f"Every great memory starts with showing up. This {event_type} could be yours."},
        {"style": "witty", "label": "😏 Witty & Meme", "caption": f"Me before: 'I have too much work.' Me after seeing {event_type}: 'I'll sleep when I'm dead.'"},
        {"style": "professional", "label": "💼 Professional", "caption": f"We're hosting {event_type}. A great opportunity to learn, network, and grow. Join us."},
    ]}


async def generate_engagement_kit(
    event_type: str, date: str = "", extra: str = "", brand: dict = None
) -> dict:
    """Generate Instagram polls, story Q&A prompts, quiz post and countdown hook."""
    brand_str = ""
    if brand and brand.get("club_name"):
        brand_str = f"\nClub: {brand['club_name']}"

    prompt = f"""Create social media engagement content for this campus event:
Event: {event_type}
Date: {date or 'TBD'}
Details: {extra or 'None'}{brand_str}

Return ONLY this JSON (no markdown):
{{
  "polls": [
    {{"question": "poll question 1", "options": ["Option A", "Option B"]}},
    {{"question": "poll question 2", "options": ["Option A", "Option B"]}},
    {{"question": "poll question 3", "options": ["Option A", "Option B"]}}
  ],
  "story_prompts": [
    "Ask us your biggest question about [event]",
    "What are you most excited for?",
    "Finish this: At {event_type}, I want to...",
    "Drop a gif that describes your hype level",
    "Tag a friend who NEEDS to come to this"
  ],
  "quiz": {{
    "question": "knowledge/trivia question related to the event theme",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A) ...",
    "fun_fact": "interesting fact related to the quiz topic, 1 sentence"
  }},
  "countdown_hook": "catchy single-line countdown teaser e.g. 'T-minus 3 days... are YOU ready? 👀'"
}}"""
    messages = [
        {"role": "system", "content": "You are a social media engagement strategist. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]
    raw = await chat_with_ollama(messages)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass
    return {
        "polls": [
            {"question": f"Are you coming to {event_type}?", "options": ["Absolutely! 🙌", "Maybe..."]},
            {"question": "What are you most excited about?", "options": ["The activities", "Meeting people"]},
            {"question": "How did you hear about this?", "options": ["WhatsApp group", "Instagram post"]},
        ],
        "story_prompts": [
            f"Ask us anything about {event_type}",
            "What are you most excited for?",
            f"Finish this: At {event_type} I want to...",
            "Drop a gif that matches your hype level",
            "Tag a friend who NEEDS to come",
        ],
        "quiz": {
            "question": f"What is {event_type} all about?",
            "options": ["A) Fun & learning", "B) Just for credits", "C) Food only", "D) I don't know"],
            "answer": "A) Fun & learning",
            "fun_fact": f"{event_type} events help students build real-world skills beyond the classroom.",
        },
        "countdown_hook": f"T-minus {date or '3 days'}... are YOU ready? 👀 #{event_type.replace(' ','').lower()}",
    }



async def general_chat(history: list[dict], user_message: str, user_profile: dict = None) -> str:
    """General conversational response, optionally personalized by user profile."""
    system = SYSTEM_PROMPT
    if user_profile:
        if user_profile.get("personalization_summary"):
            system += f"\n\nUser persona: {user_profile['personalization_summary']}"
        cats = user_profile.get("top_categories", [])
        if cats:
            system += f" Their favorite activities: {', '.join(cats)}."
        college = user_profile.get("college_name", "")
        city = user_profile.get("city", "")
        if college:
            system += f" They study at {college}."
        if city:
            system += f" They are located in {city}, India. When suggesting food, hangouts, or nearby places, recommend real places in {city} that are appropriate for college students. Use Indian Rupees (Rs or Rs.) for all prices."
        else:
            system += " Use Indian Rupees (Rs or Rs.) for all price mentions."
    messages = [{"role": "system", "content": system}] + history[-10:] + [
        {"role": "user", "content": user_message}
    ]
    return await _clean_chat(messages)


async def analyze_onboarding_behavior(answers: dict) -> dict:
    """Use LLM to analyze onboarding answers and return a structured behavioral profile."""
    college = answers.get('college_name', '')
    city = answers.get('city', '')
    location_context = ""
    if college or city:
        location_context = f"- Institution: {college or 'not specified'}\n- City/Location: {city or 'not specified'}\n"

    prompt = f"""You are a behavioral analyst AI for a campus activity app.
Analyze these onboarding answers from a student and return a JSON behavioral profile.

Answers:
{location_context}- Favorite activities: {', '.join(answers.get('favorite_activities', []))}
- Daily budget (Indian Rupees): {answers.get('daily_budget', 300)}
- Most active time: {answers.get('active_time', 'afternoon')}
- Social style: {answers.get('social_style', 'mixed')}
- Primary motivation: {answers.get('motivation', 'relaxation')}
- Exploration score (1=stick to favorites, 5=love new things): {answers.get('exploration_score', 3)}
- Frequented campus areas: {', '.join(answers.get('campus_areas', []))}

Return ONLY this JSON (no markdown, no extra text):
{{
  "spending_style": "budget_conscious|balanced|free_spender",
  "activity_persona": "homebody|explorer|social_butterfly|achiever",
  "social_preference": "solo|small_group|large_group|mixed",
  "exploration_level": 1-5 integer,
  "energy_level": "low|moderate|high",
  "top_categories": ["cat1", "cat2", "cat3"],
  "personalization_summary": "2-3 sentence plain English persona description",
  "optimization_weights": {{
    "budget_weight": 0.30,
    "preference_weight": 0.25,
    "time_weight": 0.20,
    "proximity_weight": 0.15,
    "diversity_weight": 0.10
  }}
}}

Adjust optimization_weights based on the profile:
- budget_conscious users: increase budget_weight to 0.40, reduce others proportionally
- free_spender users: reduce budget_weight to 0.20, increase preference_weight to 0.35
- high exploration: increase diversity_weight to 0.20, reduce preference_weight
- solo/homebody: increase time_weight (time efficiency matters more)
- social_butterfly: increase diversity_weight
All 5 weights must sum to exactly 1.0.
"""
    messages = [
        {"role": "system", "content": "You are a behavioral analysis engine. Return only valid JSON."},
        {"role": "user", "content": prompt},
    ]
    raw = await chat_with_ollama(messages)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            # Validate and normalise weights
            weights = data.get("optimization_weights", {})
            required = ["budget_weight", "preference_weight", "time_weight", "proximity_weight", "diversity_weight"]
            if not all(k in weights for k in required):
                weights = {"budget_weight": 0.30, "preference_weight": 0.25, "time_weight": 0.20,
                           "proximity_weight": 0.15, "diversity_weight": 0.10}
            total = sum(weights.values())
            if abs(total - 1.0) > 0.05:
                weights = {k: round(v / total, 3) for k, v in weights.items()}
            data["optimization_weights"] = weights
            return data
    except Exception:
        pass
    # Fallback defaults
    return {
        "spending_style": "balanced",
        "activity_persona": "explorer",
        "social_preference": "mixed",
        "exploration_level": 3,
        "energy_level": "moderate",
        "top_categories": answers.get("favorite_activities", [])[:3],
        "personalization_summary": "A balanced campus student who enjoys a variety of activities.",
        "optimization_weights": {
            "budget_weight": 0.30, "preference_weight": 0.25, "time_weight": 0.20,
            "proximity_weight": 0.15, "diversity_weight": 0.10,
        },
    }

async def extract_campus_knowledge(image_base64: str, filename: str = "") -> dict:
    """Analyze a campus site map image and extract a structured knowledge graph.
    Uses Ollama vision API if available (llava model), falls back to llama3.2 with text description."""
    vision_prompt = """You are analyzing a campus site map or blueprint image.
Extract all visible information and return ONLY a valid JSON object with this exact structure:
{
  "areas": ["Main Block", "Canteen", "Sports Complex", ...],
  "food_spots": ["Canteen", "Dining Hall", "Food Court", ...],
  "academic_blocks": ["Main Block", "Mech Block", "AI Block", ...],
  "sports_facilities": ["Sports Arena", "Football Ground", ...],
  "hostels": ["Gents Hostel", "Ladies Hostel", ...],
  "landmarks": ["Temple", "Parking", "OAT", ...],
  "entry_points": ["Main Gate", "Side Gate", ...],
  "description": "Brief plain-text description of the campus layout"
}
Include only what you can actually see in the image. Return only the JSON, no explanation."""

    # Try vision-capable model (llava) first
    vision_payload = {
        "model": "llava",
        "messages": [
            {
                "role": "user",
                "content": vision_prompt,
                "images": [image_base64],
            }
        ],
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 800},
    }

    raw_text = ""
    async with httpx.AsyncClient(timeout=120) as client:
        # Try llava first
        try:
            resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/chat", json=vision_payload)
            resp.raise_for_status()
            raw_text = resp.json()["message"]["content"]
        except Exception:
            # Fall back to llama3.2 with a descriptive text prompt
            text_payload = {
                "model": settings.OLLAMA_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a campus layout analyzer. Extract campus knowledge from the description and return JSON.",
                    },
                    {
                        "role": "user",
                        "content": f"A campus site map image named '{filename}' was uploaded. "
                                   "Based on a typical engineering college layout, extract a knowledge graph. "
                                   + vision_prompt,
                    },
                ],
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 600},
            }
            try:
                resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/chat", json=text_payload)
                resp.raise_for_status()
                raw_text = resp.json()["message"]["content"]
            except Exception as e:
                raw_text = ""

    # Parse JSON from response
    try:
        # Find JSON block in response
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if json_match:
            kg = json.loads(json_match.group())
            # Ensure all expected keys exist
            kg.setdefault("areas", [])
            kg.setdefault("food_spots", [])
            kg.setdefault("academic_blocks", [])
            kg.setdefault("sports_facilities", [])
            kg.setdefault("hostels", [])
            kg.setdefault("landmarks", [])
            kg.setdefault("entry_points", [])
            kg.setdefault("description", "Campus map uploaded successfully.")
            # Combine all area types into 'areas' for easy access
            all_areas = list(set(
                kg["areas"]
                + kg["food_spots"]
                + kg["academic_blocks"]
                + kg["sports_facilities"]
                + kg["hostels"]
                + kg["landmarks"]
            ))
            kg["areas"] = all_areas
            return kg, raw_text
    except Exception:
        pass

    # Fallback knowledge graph
    fallback = {
        "areas": ["Main Campus", "Canteen", "Library", "Sports Complex", "Hostel", "Auditorium"],
        "food_spots": ["Canteen"],
        "academic_blocks": ["Main Block"],
        "sports_facilities": ["Sports Complex"],
        "hostels": ["Hostel"],
        "landmarks": [],
        "entry_points": ["Main Gate"],
        "description": "Campus map uploaded. Detailed knowledge extraction requires a vision-capable model.",
    }
    return fallback, raw_text or "Map uploaded."