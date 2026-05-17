"""Логика хода игры «5 млн»: получить вопрос, принять ответы, подвести итог раунда."""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'state')
    session_id = params.get('session_id')

    if not session_id:
        return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'session_id required'}, ensure_ascii=False)}

    conn = get_conn()
    cur = conn.cursor()

    # GET state — текущее состояние игры
    if method == 'GET' and action == 'state':
        cur.execute(f"SELECT status, current_question, round FROM {schema}.game_sessions WHERE id = {session_id}")
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 404, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Session not found'}, ensure_ascii=False)}
        status, cur_q, rnd = row

        cur.execute(f"""
            SELECT id, name, avatar, mistakes, eliminated, eliminated_at_round, is_winner, seat
            FROM {schema}.game_players WHERE session_id = {session_id} ORDER BY seat
        """)
        players = [{'id': r[0], 'name': r[1], 'avatar': r[2], 'mistakes': r[3],
                    'eliminated': r[4], 'eliminated_at_round': r[5], 'is_winner': r[6], 'seat': r[7]}
                   for r in cur.fetchall()]

        question = None
        if cur_q > 0 and status == 'playing':
            cur.execute(f"""
                SELECT question_text, correct_answer, explanation
                FROM {schema}.game_questions
                WHERE session_id = {session_id} AND question_number = {cur_q}
            """)
            qrow = cur.fetchone()
            if qrow:
                question = {'number': cur_q, 'text': qrow[0], 'correct_answer': qrow[1], 'explanation': qrow[2]}

        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'status': status, 'current_question': cur_q, 'round': rnd,
                                    'players': players, 'question': question}, ensure_ascii=False)}

    # POST answer — принять ответы всех игроков на текущий вопрос
    if method == 'POST' and action == 'answer':
        body = json.loads(event.get('body') or '{}')
        answers = body.get('answers', {})  # {player_id: true/false}

        cur.execute(f"SELECT current_question, round, status FROM {schema}.game_sessions WHERE id = {session_id}")
        row = cur.fetchone()
        if not row or row[2] != 'playing':
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Game not active'}, ensure_ascii=False)}
        cur_q, rnd, _ = row

        cur.execute(f"SELECT correct_answer FROM {schema}.game_questions WHERE session_id = {session_id} AND question_number = {cur_q}")
        correct = cur.fetchone()[0]

        results = {}
        for pid_str, ans in answers.items():
            pid = int(pid_str)
            is_correct = (ans == correct)
            results[pid] = is_correct
            cur.execute(f"""
                INSERT INTO {schema}.game_answers (session_id, player_id, question_number, answer, is_correct)
                VALUES ({session_id}, {pid}, {cur_q}, {'true' if ans else 'false'}, {'true' if is_correct else 'false'})
            """)
            if not is_correct:
                cur.execute(f"UPDATE {schema}.game_players SET mistakes = mistakes + 1 WHERE id = {pid} AND session_id = {session_id}")

        next_q = cur_q + 1
        eliminated_now = []

        # Каждые 10 вопросов — исключаем 2 с наибольшим числом ошибок
        if cur_q % 10 == 0 and cur_q < 25:
            cur.execute(f"""
                SELECT id, name, mistakes FROM {schema}.game_players
                WHERE session_id = {session_id} AND eliminated = false
                ORDER BY mistakes DESC, id ASC
            """)
            active = cur.fetchall()
            # Исключаем 2 худших (если осталось > 2)
            to_eliminate = active[:2] if len(active) > 2 else []
            for p in to_eliminate:
                cur.execute(f"""
                    UPDATE {schema}.game_players SET eliminated = true, eliminated_at_round = {rnd}
                    WHERE id = {p[0]}
                """)
                eliminated_now.append({'id': p[0], 'name': p[1], 'mistakes': p[2]})
            new_round = rnd + 1
            cur.execute(f"UPDATE {schema}.game_sessions SET round = {new_round} WHERE id = {session_id}")

        # Финал: вопрос 25 — определяем победителя
        winner = None
        if cur_q == 25:
            cur.execute(f"""
                SELECT id, name FROM {schema}.game_players
                WHERE session_id = {session_id} AND eliminated = false
                ORDER BY mistakes ASC, id ASC LIMIT 1
            """)
            w = cur.fetchone()
            if w:
                cur.execute(f"UPDATE {schema}.game_players SET is_winner = true WHERE id = {w[0]}")
                winner = {'id': w[0], 'name': w[1]}
            cur.execute(f"UPDATE {schema}.game_sessions SET status = 'finished', finished_at = NOW(), current_question = 25 WHERE id = {session_id}")
        else:
            cur.execute(f"UPDATE {schema}.game_sessions SET current_question = {next_q} WHERE id = {session_id}")

        conn.commit()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'correct_answer': correct,
                    'results': {str(k): v for k, v in results.items()},
                    'eliminated': eliminated_now,
                    'winner': winner,
                    'next_question': next_q if cur_q < 25 else None,
                }, ensure_ascii=False)}

    # POST next — перейти к следующему вопросу
    if method == 'POST' and action == 'next':
        cur.execute(f"SELECT current_question FROM {schema}.game_sessions WHERE id = {session_id}")
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 404, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Not found'}, ensure_ascii=False)}
        next_q = row[0]
        cur.execute(f"""
            SELECT question_text, correct_answer, explanation
            FROM {schema}.game_questions WHERE session_id = {session_id} AND question_number = {next_q}
        """)
        qrow = cur.fetchone()
        cur.close(); conn.close()
        if not qrow:
            return {'statusCode': 404, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'Question not found'}, ensure_ascii=False)}
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'number': next_q, 'text': qrow[0], 'correct_answer': qrow[1], 'explanation': qrow[2]}, ensure_ascii=False)}

    cur.close(); conn.close()
    return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Unknown action'}, ensure_ascii=False)}
