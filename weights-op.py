import json
import numpy as np
import random
from collections import Counter


def load_json(file_path):
    """Load a JSON file."""
    with open(file_path, "r") as file:
        return json.load(file)


def normalize_scores(scores):
    """Normalize scores to a range of 0 to 1."""
    min_score, max_score = 0, 10  # Assuming trait scores are between 0 and 10
    return {trait: (value - min_score) / (max_score - min_score) for trait, value in scores.items()}


def calculate_similarity(average_scores, lebron_ratings, trait_weights):
    """
    Calculate weighted cosine similarity between user scores and LeBron ratings.
    Higher values indicate better matches (closer to 1).
    """
    weighted_user = np.array([average_scores[trait] * trait_weights[trait] for trait in trait_weights])
    weighted_lebron = np.array([lebron_ratings[trait] * trait_weights[trait] for trait in trait_weights])

    # Compute cosine similarity
    dot_product = np.dot(weighted_user, weighted_lebron)
    norm_user = np.linalg.norm(weighted_user)
    norm_lebron = np.linalg.norm(weighted_lebron)

    return dot_product / (norm_user * norm_lebron) if norm_user and norm_lebron else 0


def find_closest_lebron(average_scores, lebrons, trait_weights, lebron_counts, diversity_boost=0.1):
    """Find the LeBron whose ratings are most similar to the user's average scores."""
    best_lebron = None
    highest_score = -1  # Initialize as lowest possible score

    for lebron in lebrons:
        similarity = calculate_similarity(average_scores, lebron["ratings"], trait_weights)

        # Add diversity boost: penalize frequently selected LeBrons
        penalty = diversity_boost * lebron_counts.get(lebron["name"], 0)
        adjusted_score = similarity - penalty

        if adjusted_score > highest_score:
            highest_score = adjusted_score
            best_lebron = lebron

    return best_lebron


def random_walk(question_file, rating_questions, lebrons, trait_weights, steps=10, diversity_boost=0.1):
    """
    Perform a random walk through the question file and return the distribution of LeBron results.
    Each step picks a random answer, calculates average scores, and finds the closest LeBron.
    """
    lebron_counts = Counter()
    questions = question_file["questions"]

    for _ in range(steps):
        # Pick a random question and one random answer from its options
        selected_answers = []
        for question in questions:
            selected_answers.append(random.choice(question["answers"]))

        # Calculate average normalized trait scores for the selected answers
        average_scores = {
            trait: np.mean(
                [normalize_scores(rating_questions[answer])[trait] for answer in selected_answers]
            )
            for trait in trait_weights.keys()
        }

        # Find the closest LeBron with diversity boost
        closest_lebron = find_closest_lebron(average_scores, lebrons, trait_weights, lebron_counts, diversity_boost)
        lebron_counts[closest_lebron["name"]] += 1

    return lebron_counts


def optimize_weights(lebrons, questions, rating_questions, iterations=1000, steps_per_walk=10, target_diversity=10):
    """
    Optimize trait weights to maximize diversity of LeBron results across random walks.
    """
    traits = lebrons[0]["ratings"].keys()  # Assuming all LeBrons have the same traits
    best_weights = {trait: random.uniform(0.5, 1.5) for trait in traits}  # Start with variability
    best_score = 0

    for _ in range(iterations):
        # Generate random weights with small random adjustments
        trial_weights = {trait: max(0.1, best_weights[trait] + random.uniform(-0.1, 0.1)) for trait in traits}

        # Perform a random walk and calculate diversity distribution
        lebron_counts = random_walk(questions, rating_questions, lebrons, trial_weights, steps_per_walk, diversity_boost=0.2)
        diversity = len(lebron_counts)  # Number of unique LeBrons
        consistency = min(lebron_counts.values()) / max(lebron_counts.values()) if len(lebron_counts) > 1 else 0

        # Combined objective: prioritize diversity heavily
        score = 2 * diversity + consistency  # Increase the weight of diversity

        # Keep the weights if they improve the score
        if score > best_score:
            best_score = score
            best_weights = trial_weights

    return best_weights, best_score


def main():
    # Load the JSON files
    lebrons = load_json("lebrons.json")["results"]
    questions = load_json("question-1.json")
    rating_questions = load_json("rating-questions.json")

    # Optimize weights for maximum diversity and consistency
    best_weights, best_score = optimize_weights(
        lebrons, questions, rating_questions, iterations=1000, steps_per_walk=10, target_diversity=10
    )

    print("Optimized Trait Weights for Diversity and Consistency:")
    print(best_weights)
    print(f"Best Combined Score Achieved: {best_score:.2f}")


if __name__ == "__main__":
    main()
