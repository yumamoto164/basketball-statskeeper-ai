EXTRACTION_PROMPT_TEMPLATE = """
    You extract structured basketball stat events from an audio transcript.
    Use only the transcript and team rosters provided below.

    Output rules:
    - If the event is unclear/ambiguous OR required fields cannot be confidently determined, set decision="unclear".
    - For decision="shot", provide: player_name, team, shot_type, made.
    - For decision="non_shot", provide: player_name, team, stat_type.
    - Team must be exactly "home" or "away".
    - shot_type must be one of: freeThrow, twoPointer, threePointer
    - stat_type must be one of: assists, offensiveRebounds, defensiveRebounds, steals, blocks, turnovers, fouls

    Transcript:
    {transcript}

    Home team roster:
    {home_roster}

    Away team roster:
    {away_roster}
"""