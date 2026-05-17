"""Загрузка видеовыпуска LEGO ТВ в S3 и сохранение в БД."""
import json
import os
import base64
import uuid
import psycopg2
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    title = body.get('title', '').strip()
    summary = body.get('summary', '').strip()
    content = body.get('content', '').strip()
    episode_number = body.get('episode_number', 1)
    thumbnail_b64 = body.get('thumbnail')
    video_b64 = body.get('video')

    if not title or not summary or not content:
        return {
            'statusCode': 400,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Заполните title, summary, content'}, ensure_ascii=False),
        }

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    key_id = os.environ['AWS_ACCESS_KEY_ID']
    video_url = None
    thumbnail_url = None

    if video_b64:
        vid_bytes = base64.b64decode(video_b64)
        vid_key = f'lego-tv/videos/{uuid.uuid4()}.mp4'
        s3.put_object(Bucket='files', Key=vid_key, Body=vid_bytes, ContentType='video/mp4')
        video_url = f'https://cdn.poehali.dev/projects/{key_id}/files/{vid_key}'

    if thumbnail_b64:
        thumb_bytes = base64.b64decode(thumbnail_b64)
        thumb_key = f'lego-tv/thumbs/{uuid.uuid4()}.jpg'
        s3.put_object(Bucket='files', Key=thumb_key, Body=thumb_bytes, ContentType='image/jpeg')
        thumbnail_url = f'https://cdn.poehali.dev/projects/{key_id}/files/{thumb_key}'

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    safe_title = title.replace("'", "''")
    safe_summary = summary.replace("'", "''")
    safe_content = content.replace("'", "''")
    vid_val = f"'{video_url}'" if video_url else 'NULL'
    thumb_val = f"'{thumbnail_url}'" if thumbnail_url else 'NULL'

    cur.execute(f"""
        INSERT INTO {schema}.episodes (title, summary, content, video_url, thumbnail_url, episode_number)
        VALUES ('{safe_title}', '{safe_summary}', '{safe_content}', {vid_val}, {thumb_val}, {episode_number})
        RETURNING id
    """)
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'id': new_id, 'video_url': video_url, 'thumbnail_url': thumbnail_url}, ensure_ascii=False),
    }
