"""Список выпусков LEGO ТВ с поиском и фильтрацией."""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    search = params.get('search', '').strip()
    limit = min(int(params.get('limit', 20)), 50)
    offset = int(params.get('offset', 0))

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')

    where = ''
    if search:
        safe = search.replace("'", "''")
        where = f"WHERE title ILIKE '%{safe}%' OR summary ILIKE '%{safe}%'"

    cur.execute(f"""
        SELECT id, title, summary, content, video_url, thumbnail_url,
               duration_seconds, episode_number,
               to_char(aired_at, 'DD.MM.YYYY HH24:MI') as aired_at
        FROM {schema}.episodes
        {where}
        ORDER BY aired_at DESC
        LIMIT {limit} OFFSET {offset}
    """)
    rows = cur.fetchall()

    cur.execute(f"SELECT COUNT(*) FROM {schema}.episodes {where}")
    total = cur.fetchone()[0]

    cur.close()
    conn.close()

    episodes = [
        {
            'id': r[0],
            'title': r[1],
            'summary': r[2],
            'content': r[3],
            'video_url': r[4],
            'thumbnail_url': r[5],
            'duration_seconds': r[6],
            'episode_number': r[7],
            'aired_at': r[8],
        }
        for r in rows
    ]

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'episodes': episodes, 'total': total}, ensure_ascii=False),
    }
