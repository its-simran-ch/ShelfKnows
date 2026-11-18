import sys
import os
import re

# Ensure project root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

class RecommendationExplainer:
    def __init__(self):
        print("Recommendation Explainer initialized with Dynamic Book-Specific Intelligence.")

    def _extract_motifs(self, text):
        t = str(text).lower()
        motifs = set()

        rules = [
            ("academy", ["academy", "school", "university", "college", "student", "scholar", "education", "class", "campus", "hogwarts", "boarding"]),
            ("darkness", ["dark", "shadow", "gothic", "death", "deadly", "blood", "evil", "night", "noir", "grim", "horror", "curse", "demon", "vampire"]),
            ("secrets", ["secret", "mystery", "hidden", "conspiracy", "forbidden", "clue", "enigma", "uncover", "truth", "lies", "lie", "murder", "detective", "investigation", "crime", "suspense", "killer"]),
            ("magic", ["magic", "wizard", "spell", "arcane", "witch", "sorcerer", "enchant", "dragon", "myth", "powers", "realm", "kingdom", "sword", "prophecy", "magical", "fae", "elf", "potter"]),
            ("survival", ["survival", "danger", "game", "hunger", "arena", "escape", "hunt", "isolated", "deadly", "survive", "wilderness", "peril"]),
            ("rebellion", ["rebel", "rebellion", "revolution", "regime", "oppress", "tyrant", "dystop", "empire", "fight", "resistance", "freedom", "totalitarian", "surveillance"]),
            ("cosmic", ["space", "sci-fi", "galaxy", "future", "alien", "star", "planet", "odyssey", "robot", "cyber", "ai", "dune", "quantum", "interstellar", "universe"]),
            ("growth", ["mind", "habit", "success", "productivity", "psychology", "growth", "think", "money", "leader", "power", "rules", "wealth", "strategy", "behavior", "discipline", "investing", "business"]),
            ("romance", ["love", "romance", "heart", "relationship", "passion", "couple", "dating", "marriage", "pride", "desire", "beloved", "tender", "longing", "courtship"]),
            ("history", ["history", "historic", "biography", "war", "century", "civilization", "revolution", "memoir", "historical", "president", "king", "queen", "empire", "legacy", "biographical", "ancient"]),
            ("technology", ["technology", "computing", "software", "code", "machine learning", "neural", "hardware", "digital", "data", "internet", "tech", "algorithm", "computer"]),
            ("philosophy", ["philosophy", "existential", "life", "meaning", "wisdom", "soul", "morality", "truth", "deep", "humanity", "society", "justice", "meditation", "1984"]),
            ("whimsical", ["calvin and hobbes", "comic strip", "cartoon", "whimsical"])
        ]

        for motif, keywords in rules:
            if any(re.search(r'\b' + re.escape(kw) + r'\b', t) if len(kw) <= 4 else kw in t for kw in keywords):
                motifs.add(motif)

        return motifs

    def explain(self, query, book, index=0):
        """
        Generates a personalized, context-aware explanation for why
        this specific book was recommended for the user's query, dynamically
        synthesizing the book's individual thematic strengths, authorship,
        and reader reception.
        """
        title = book.get('title', 'Unknown Title')
        authors = book.get('authors', 'Unknown Author')
        genre = book.get('genres', 'Fiction')
        desc = book.get('description', '')
        rating = float(book.get('average_rating', 4.0)) if book.get('average_rating') is not None else 4.0

        q_motifs = self._extract_motifs(query)
        b_motifs = self._extract_motifs(f"{title} {genre} {desc}")

        title_lower = title.lower()
        is_comic = "calvin and hobbes" in title_lower or "comic strip" in title_lower

        # What does this book specifically bring to the table?
        shared = q_motifs.intersection(b_motifs)

        if is_comic:
            angle = "delivers an imaginative and playful perspective with heartwarming whimsy and gentle existential humor"
            highlight = f"a beloved creative masterpiece holding a rare {rating:.2f}★ rating"
        elif "academy" in b_motifs or ("academy" in shared):
            angle = "explores the perils of forbidden lore and institutional rivalries within an immersive scholarly backdrop"
            highlight = f"praised by {genre.lower()} readers for intense pacing ({rating:.2f}★)"
        elif "darkness" in b_motifs or ("darkness" in shared):
            angle = "delves into shadowy supernatural tensions and secretive forces, matching your craving for dark atmospheric suspense"
            highlight = f"celebrated for its brooding ambiance and {rating:.2f}★ community rating"
        elif "secrets" in b_motifs or ("secrets" in shared) or ("secrets" in q_motifs and genre == "Mystery & Crime Thriller"):
            angle = "unravels complex layers of deception, hidden motives, and psychological intrigue that keep readers guessing"
            highlight = f"a masterful puzzle backed by a solid {rating:.2f}★ reader rating"
        elif "survival" in b_motifs or "rebellion" in b_motifs or ("survival" in shared or "rebellion" in shared):
            angle = "plunges straight into brutal survival dilemmas and fierce resistance against oppressive authority"
            highlight = f"a gripping page-turner with an impressive {rating:.2f}★ community rating"
        elif "cosmic" in b_motifs or ("cosmic" in shared) or ("cosmic" in q_motifs and genre == "Sci-Fi & Dystopian"):
            angle = "expands on speculative futurism and technological marvels, exploring the far reaches of human and cosmic horizons"
            highlight = f"acclaimed for imaginative scope and compelling world-building ({rating:.2f}★)"
        elif "growth" in b_motifs or ("growth" in shared) or genre == "Business & Self-Help":
            angle = "provides transformative cognitive frameworks and practical principles to re-engineer habits and decision-making"
            highlight = f"widely recommended across reading circles with a {rating:.2f}★ rating"
        elif "romance" in b_motifs or ("romance" in shared) or genre == "Romance & Drama":
            angle = "captures poignant emotional vulnerability and the complex friction of heartfelt interpersonal bonds"
            highlight = f"cherished for its memorable character chemistry ({rating:.2f}★)"
        elif "history" in b_motifs or ("history" in shared) or genre == "History & Biography":
            angle = "brings defining historical eras alive through rigorous narrative detail, cultural depth, and intimate character portraits"
            highlight = f"celebrated for historical authenticity and a {rating:.2f}★ reader score"
        elif "technology" in b_motifs or ("technology" in shared) or genre == "Technology & AI Science":
            angle = "illuminates computational frontiers, algorithmic breakthroughs, and the evolving relationship between mind and machine"
            highlight = f"a highly influential technical work with a {rating:.2f}★ rating"
        elif "philosophy" in b_motifs or ("philosophy" in shared) or genre == "Classics & Philosophy":
            angle = "invites contemplative meditation on morality, human nature, and timeless questions of meaning"
            highlight = f"an enduring classic with deep thematic resonance ({rating:.2f}★)"
        elif "magic" in b_motifs or ("magic" in shared) or genre == "Fantasy & Magic":
            angle = "immerses readers in vivid mystical lore, ancient enchantments, and epic fantasy storytelling"
            highlight = f"a standout high-fantasy journey backed by a {rating:.2f}★ reader score"
        else:
            angle = f"stands out in {genre.lower()} for its rich narrative textures, compelling pacing, and distinct authorial voice"
            highlight = f"supported by an exceptional {rating:.2f}★ community score"

        # Varied sentence structures so adjacent cards never repeat opening patterns
        templates = [
            f"Selected for your interest in '{query}': '{title}' by {authors} {angle} — {highlight}.",
            f"Connects to your search through {authors}'s distinct {genre.lower()} vision, where '{title}' {angle} ({rating:.2f}★).",
            f"A natural match for your query: '{title}' {angle}, earning distinction as {highlight}."
        ]

        return templates[index % len(templates)]

    def explain_genre(self, book, genre_name="All Genres", index=0):
        """
        Generates a rich, meaningful, book-specific rationale for why this title was
        curated on the Genres page, synthesizing its specific narrative motifs,
        authorship, Goodreads reader volume, and critical standing.
        """
        title = book.get('title', 'Unknown Title')
        authors = book.get('authors', 'Unknown Author')
        genres = book.get('genres', genre_name)
        rating = float(book.get('average_rating', 4.0)) if book.get('average_rating') is not None else 4.0
        ratings_count = int(book.get('ratings_count', 0)) if book.get('ratings_count') is not None else 0
        desc = book.get('description', '')

        # Resolve clean genre label
        is_all = not genre_name or genre_name.strip().lower() in ["all", "all genres", "all genre"]
        if is_all:
            primary_genre = genres.split(',')[0].strip() if genres else "World Literature"
            genre_label = primary_genre
        else:
            genre_label = genre_name.strip()

        combined_text = f"{title} {genre_label} {genres} {desc}"
        b_motifs = self._extract_motifs(combined_text)

        title_lower = title.lower()
        is_comic = "calvin and hobbes" in title_lower or "comic strip" in title_lower

        # Determine authentic thematic angle based on book's traits and genre context
        if is_comic:
            angle = "delivers an imaginative blend of laugh-out-loud childhood antics, comic brilliance, and tender existential humor"
        elif any(w in genre_label.lower() for w in ["mystery", "thriller", "crime"]):
            if "darkness" in b_motifs or "gothic" in b_motifs:
                angle = "delves into chilling gothic dread, shadowy clues, and the haunting psychological contours of an unsolved crime"
            else:
                angle = "unravels an intricate labyrinth of deceptive motives, relentless investigative intrigue, and edge-of-your-seat suspense"
        elif any(w in genre_label.lower() for w in ["fantasy", "magic"]):
            if "academy" in b_motifs:
                angle = "explores the wonders of magical scholarship, hidden chambers, and legendary rivalries within an unforgettable wizarding world"
            else:
                angle = "builds a spellbinding tapestry of ancient enchantments, vivid mythic lore, and epic high-stakes conflict"
        elif any(w in genre_label.lower() for w in ["sci-fi", "science fiction", "dystopian"]):
            if "rebellion" in b_motifs:
                angle = "chronicles fierce resistance against futuristic totalitarian rule, planetary intrigue, and high-concept technology"
            else:
                angle = "stretches speculative horizons with visionary world-building, high-concept technology, and planetary drama"
        elif any(w in genre_label.lower() for w in ["business", "self-help"]):
            angle = "delivers evidence-based behavioral strategies, powerful mental models, and actionable insights to transform habits and thinking"
        elif any(w in genre_label.lower() for w in ["technology", "ai"]):
            angle = "illuminates modern computational frontiers, algorithmic breakthroughs, and the evolving intersection of human thought and machine intelligence"
        elif any(w in genre_label.lower() for w in ["history", "biography"]):
            angle = "breathes vivid life into defining historical eras through rigorous storytelling, intimate character portraits, and profound cultural context"
        elif any(w in genre_label.lower() for w in ["romance"]):
            angle = "tenderly captures magnetic interpersonal chemistry, poignant emotional vulnerability, and the complex friction of enduring love"
        elif "secrets" in b_motifs:
            angle = "unravels an intricate labyrinth of deceptive motives, hidden truths, and edge-of-your-seat psychological suspense"
        elif "magic" in b_motifs:
            angle = "builds a spellbinding tapestry of ancient enchantments, vivid mythic lore, and epic high-stakes conflict"
        elif "cosmic" in b_motifs:
            angle = "stretches speculative horizons with visionary world-building, high-concept technology, and planetary drama"
        elif "survival" in b_motifs or "rebellion" in b_motifs:
            angle = "thrusts readers into a pulse-pounding struggle of sheer survival, defiant resistance, and moral grit against oppressive powers"
        elif "growth" in b_motifs:
            angle = "delivers evidence-based behavioral strategies, powerful mental models, and actionable insights to transform habits and thinking"
        elif "philosophy" in b_motifs or "darkness" in b_motifs:
            angle = "probes haunting existential questions, psychological depth, and the intricate moral tensions of human nature"
        else:
            angle = f"stands out in {genre_label.lower()} for its rich narrative textures, compelling pacing, and distinct authorial voice"

        # Formulate reader acclaim highlight
        if ratings_count >= 1_000_000:
            acclaim = f"backed by over {round(ratings_count / 1_000_000, 1)}M Goodreads readers with an exceptional {rating:.2f}★ rating"
        elif ratings_count >= 100_000:
            acclaim = f"cherished across {round(ratings_count / 1_000):,}K+ reader reviews with an impressive {rating:.2f}★ rating"
        elif ratings_count >= 10_000:
            acclaim = f"praised by {round(ratings_count / 1_000):,}K+ community readers with a distinguished {rating:.2f}★ rating"
        else:
            acclaim = f"holding an outstanding {rating:.2f}★ rating on Goodreads"

        # Author string formatting
        author_clean = authors.strip() if authors else ""
        has_author = author_clean and author_clean.lower() not in ["unknown author", "unknown", "none"]
        author_possessive = f"{author_clean}'" if author_clean.endswith(('s', 'S')) else f"{author_clean}'s"

        # Varied sentence structures so adjacent cards never repeat the same opening
        if is_all:
            templates = [
                f"Curated as a premier masterwork in {genre_label}: {author_possessive + ' ' if has_author else ''}'{title}' {angle} — {acclaim}.",
                f"A standout literary landmark: '{title}'{(' by ' + author_clean) if has_author else ''} {angle}. Highly celebrated across Goodreads ({rating:.2f}★).",
                f"Selected for its remarkable storytelling: {author_clean if has_author else 'This work'} {angle}, making '{title}' a defining classic ({acclaim}).",
                f"Representing the finest storytelling in {genre_label}: '{title}' {angle} ({rating:.2f}★ on Goodreads).",
                f"'{title}'{(' by ' + author_clean) if has_author else ''} {angle}. It remains a reader favorite across generations, {acclaim}."
            ]
        else:
            templates = [
                f"Curated for {genre_label}: {author_possessive + ' ' if has_author else ''}'{title}' {angle} — {acclaim}.",
                f"A standout selection in {genre_label}: '{title}'{(' by ' + author_clean) if has_author else ''} {angle}. Highly celebrated across Goodreads ({rating:.2f}★).",
                f"Selected for its narrative brilliance: {author_clean if has_author else 'This work'} {angle}, making '{title}' an indispensable pillar of {genre_label} ({acclaim}).",
                f"Representing the finest in {genre_label}: '{title}' {angle} ({rating:.2f}★ on Goodreads).",
                f"'{title}'{(' by ' + author_clean) if has_author else ''} {angle}. It remains a definitive benchmark in {genre_label}, {acclaim}."
            ]

        return templates[index % len(templates)]

    def attach_explanations(self, query, books):
        """
        Attaches personalized explanation strings to a list of recommended books.
        """
        for idx, book in enumerate(books):
            book['ai_explanation'] = self.explain(query, book, index=idx)
        return books

    def attach_genre_explanations(self, books, genre_name="All Genres"):
        """
        Attaches dynamic, personalized explanations to a list of curated genre books.
        """
        for idx, book in enumerate(books):
            book['ai_explanation'] = self.explain_genre(book, genre_name=genre_name, index=idx)
        return books

if __name__ == "__main__":
    explainer = RecommendationExplainer()

    sample_query = "books about rebellion against oppressive regimes"
    sample_book = {
        "title": "Seeds of Rebellion",
        "authors": "Brandon Mull",
        "genres": "Fantasy & Magic",
        "average_rating": 4.25
    }

    reason = explainer.explain(sample_query, sample_book)
    print("\nSample Recommendation Explanation:")
    print(reason)
