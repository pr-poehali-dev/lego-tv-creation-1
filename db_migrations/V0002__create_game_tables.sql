CREATE TABLE t_p13078946_lego_tv_creation_1.game_sessions (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'waiting',
    current_question INTEGER NOT NULL DEFAULT 0,
    round INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE t_p13078946_lego_tv_creation_1.game_players (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES t_p13078946_lego_tv_creation_1.game_sessions(id),
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🧱',
    mistakes INTEGER NOT NULL DEFAULT 0,
    eliminated BOOLEAN NOT NULL DEFAULT FALSE,
    eliminated_at_round INTEGER,
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    seat INTEGER NOT NULL
);

CREATE TABLE t_p13078946_lego_tv_creation_1.game_questions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES t_p13078946_lego_tv_creation_1.game_sessions(id),
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer BOOLEAN NOT NULL,
    explanation TEXT NOT NULL DEFAULT ''
);

CREATE TABLE t_p13078946_lego_tv_creation_1.game_answers (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES t_p13078946_lego_tv_creation_1.game_sessions(id),
    player_id INTEGER NOT NULL REFERENCES t_p13078946_lego_tv_creation_1.game_players(id),
    question_number INTEGER NOT NULL,
    answer BOOLEAN,
    is_correct BOOLEAN,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);
