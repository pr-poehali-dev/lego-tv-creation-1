"""Старт новой игры шоу «5 млн»: создаёт сессию, игроков и генерирует 25 вопросов через OpenAI."""
import json
import os
import psycopg2
import urllib.request

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

AVATARS = ['🧱', '🟡', '🔴', '🔵', '🟢', '🟠']
DEFAULT_PLAYERS = [
    'Алекс', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена'
]

def generate_questions(topic: str) -> list:
    prompt = f"""Сгенерируй 25 вопросов для интеллектуального шоу на тему: "{topic}".
Формат каждого вопроса: утверждение, на которое нужно ответить ВЕРНО или НЕВЕРНО.
Вопросы должны быть разной сложности — первые 10 проще, следующие 10 сложнее, последние 5 самые сложные.
Верни ТОЛЬКО JSON-массив из 25 объектов:
[{{"question": "...", "correct_answer": true/false, "explanation": "Краткое объяснение 1 предложение"}}]
Никакого текста вокруг, только JSON."""

    req_body = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 3000,
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=req_body,
        headers={
            "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        result = json.loads(resp.read())

    raw = result["choices"][0]["message"]["content"].strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    players_input = body.get('players', DEFAULT_PLAYERS)
    topic = body.get('topic', 'общие знания, наука, история, LEGO и популярная культура')

    if len(players_input) != 6:
        return {
            'statusCode': 400,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Нужно ровно 6 игроков'}, ensure_ascii=False),
        }

    questions = generate_questions(topic)

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute(f"INSERT INTO {schema}.game_sessions (status) VALUES ('playing') RETURNING id")
    session_id = cur.fetchone()[0]

    player_ids = []
    for i, name in enumerate(players_input):
        safe_name = str(name).replace("'", "''")
        avatar = AVATARS[i % len(AVATARS)]
        cur.execute(f"""
            INSERT INTO {schema}.game_players (session_id, name, avatar, seat)
            VALUES ({session_id}, '{safe_name}', '{avatar}', {i+1})
            RETURNING id
        """)
        player_ids.append(cur.fetchone()[0])

    for i, q in enumerate(questions[:25]):
        safe_q = q['question'].replace("'", "''")
        safe_exp = q.get('explanation', '').replace("'", "''")
        correct = 'true' if q['correct_answer'] else 'false'
        cur.execute(f"""
            INSERT INTO {schema}.game_questions (session_id, question_number, question_text, correct_answer, explanation)
            VALUES ({session_id}, {i+1}, '{safe_q}', {correct}, '{safe_exp}')
        """)

    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({
            'session_id': session_id,
            'players': [{'id': pid, 'name': players_input[i], 'avatar': AVATARS[i], 'seat': i+1} for i, pid in enumerate(player_ids)],
            'total_questions': len(questions[:25]),
        }, ensure_ascii=False),
    }
