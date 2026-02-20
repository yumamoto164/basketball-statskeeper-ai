EXTRACTION_PROMPT_TEMPLATE = """
    You extract structured basketball stat events from an audio transcript.
    Use only the transcript and team rosters provided below.

    Output rules:
    - If the event is unclear/ambiguous OR required fields cannot be confidently determined, set decision="unclear".
    - For decision="shot", provide: player_name or player_number, team, shot_type, made.
    - For decision="non_shot", provide: player_name or player_number, team, stat_type.
    - Team must be exactly "home" or "away". You may infer the team from the team name
      (e.g. if the speaker says "{home_team_name}" that means "home"; "{away_team_name}" means "away").
    - If the speaker identifies the player by jersey number (e.g. "player ten", "number 2", "#23",
      "player number five"), set player_number to that number as a digit string (e.g. "10", "2", "23", "5")
      and leave player_name as null — do NOT look up or infer the player's name from the roster.
      Otherwise (the speaker says a name), set player_name to the name mentioned and leave player_number as null.
    - shot_type must be one of: freeThrow, twoPointer, threePointer
    - stat_type must be one of: assists, offensiveRebounds, defensiveRebounds, steals, blocks, turnovers, fouls

    Transcript:
    {transcript}

    Home team ({home_team_name}) roster:
    {home_roster}

    Away team ({away_team_name}) roster:
    {away_roster}

    {shared_numbers_note}
"""