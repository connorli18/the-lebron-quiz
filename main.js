document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('.main-question-container');
    const startButton = document.querySelector('.start-lequiz-button');
    let currentQuestionIndex = 0;
    const userAnswers = [];

    startButton.addEventListener('click', () => {
        fetch('question-1.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch the question data');
                }
                return response.json();
            })
            .then(data => {
                loadQuestion(data.questions, currentQuestionIndex);
            })
            .catch(error => {
                console.error('Error fetching the question data:', error);
            });
    });

    function loadQuestion(questions, index) {
        if (index >= questions.length) {
            showResults(userAnswers);
            return;
        }

        const questionData = questions[index];
        mainContainer.innerHTML = `
            <div class="top-stuff">
                <div class="actual-question-container">
                    <h2 class="question-fill-in">${questionData.question}</h2>
                </div>
                <div class="image-container-question">
                    <img src="${questionData.image}" class="lebron-james-quiz-image" alt="Lebron James Quiz">
                </div>
            </div>
            <div class="bottom-stuff">
                <div class="answer-to-qs-container">
                    <div class="answer-container-row-1">
                        <div class="answer-container1">
                            <button class="answer-button" data-answer="${questionData.answers[0]}">${questionData.answers[0]}</button>
                        </div>
                        <div class="answer-container2">
                            <button class="answer-button" data-answer="${questionData.answers[1]}">${questionData.answers[1]}</button>
                        </div>
                    </div>
                    <div class="answer-container-row-2">
                        <div class="answer-container3">
                            <button class="answer-button" data-answer="${questionData.answers[2]}">${questionData.answers[2]}</button>
                        </div>
                        <div class="answer-container4">
                            <button class="answer-button" data-answer="${questionData.answers[3]}">${questionData.answers[3]}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;


        const answerButtons = document.querySelectorAll('.answer-button');
        answerButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userAnswer = button.getAttribute('data-answer');
                userAnswers.push(userAnswer);
                currentQuestionIndex++;
                loadQuestion(questions, currentQuestionIndex);
            });
        });
    }

    async function getLeBronResult(answers) {
        console.log(answers);

        try {
            const lebronsResponse = await fetch('lebrons.json');
            if (!lebronsResponse.ok) throw new Error(`Failed to load LeBron data: ${lebronsResponse.statusText}`);
            const lebrons = await lebronsResponse.json();

            const ratingsResponse = await fetch('rating-questions.json');
            if (!ratingsResponse.ok) throw new Error(`Failed to load rating questions: ${ratingsResponse.statusText}`);
            const questionRatings = await ratingsResponse.json();

            const averageScores = calculateAverageScores(answers, questionRatings);

            const diversityBoost = 0.2; // Penalize overused LeBrons
            const lebronCounts = {}; // Track LeBron selections for diversity boost
            const bestLeBron = findClosestLeBron(averageScores, lebrons.results, traitWeights, lebronCounts, diversityBoost);

            return bestLeBron;
        } catch (error) {
            console.error('Error fetching data:', error);
            return {
                name: "Unknown LeBron",
                image: "images/placeholder.jpg",
                description: "An enigma wrapped in mystery. We couldn’t find your LeBron, but you’re still a GOAT in our eyes."
            };
        }
    }

    function calculateAverageScores(answers, questionRatings) {
        const totalScores = {};
        const traitCounts = {};
        const traitRanges = {};

        // Initialize scores and calculate totals
        for (const answer of answers) {
            const ratings = questionRatings[answer];
            if (ratings) {
                for (const trait in ratings) {
                    if (!totalScores[trait]) {
                        totalScores[trait] = 0;
                        traitCounts[trait] = 0;
                        traitRanges[trait] = { min: Infinity, max: -Infinity };
                    }
                    totalScores[trait] += ratings[trait];
                    traitCounts[trait]++;
                    // Update min and max values for scaling
                    traitRanges[trait].min = Math.min(traitRanges[trait].min, ratings[trait]);
                    traitRanges[trait].max = Math.max(traitRanges[trait].max, ratings[trait]);
                }
            }
        }

        // Normalize scores to [0, 1]
        const averageScores = {};
        for (const trait in totalScores) {
            const mean = totalScores[trait] / (traitCounts[trait] || 1); // Avoid division by zero
            const range = traitRanges[trait].max - traitRanges[trait].min || 1; // Avoid zero range
            averageScores[trait] = (mean - traitRanges[trait].min) / range; // Scale to [0, 1]
        }

        return averageScores;
    }

    function findClosestLeBron(averageScores, lebrons, weights, lebronCounts = {}, diversityBoost = 0.2) {
        let bestLeBron = null;
        let highestScore = -Infinity;

        lebrons.forEach(lebron => {
            const similarity = calculateSimilarity(averageScores, lebron.ratings, weights);

            // Add diversity boost: penalize frequently selected LeBrons
            const penalty = diversityBoost * (lebronCounts[lebron.name] || 0);
            const adjustedScore = similarity - penalty;

            if (adjustedScore > highestScore) {
                highestScore = adjustedScore;
                bestLeBron = lebron;
            }
        });

        // Update the count of selected LeBron for future diversity tracking
        if (bestLeBron) {
            lebronCounts[bestLeBron.name] = (lebronCounts[bestLeBron.name] || 0) + 1;
        }

        return bestLeBron;
    }

    function calculateSimilarity(scores1, scores2, weights = {}) {
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (const trait in scores1) {
            const weight = weights[trait] || 1; // Default weight is 1
            const value1 = scores1[trait] * weight;
            const value2 = (scores2[trait] || 0) * weight;

            dotProduct += value1 * value2;
            norm1 += value1 ** 2;
            norm2 += value2 ** 2;
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        return norm1 && norm2 ? dotProduct / (norm1 * norm2) : 0; // Cosine similarity
    }

    // Trait weights (example)
    const traitWeights = {
        confidence: 0.876850850367134,
        humor: 1.3590308797724668,
        creativity: 0.9581770002100758,
        social: 0.645137516459086,
        intensity: 1.0664124278538842,
        honesty: 0.9459812098220566,
        strategy: 1.06531586911321,
        boldness: 1.4466557042696735,
        competitiveness: 1.1858407552064394,
        relatability: 0.7701276891331693
    };



    async function showResults(answers) {
        const selectedLeBron = await getLeBronResult(answers);

        mainContainer.innerHTML = `
            <div class="top-stuff">
                <div class="result-type-large">
                    <h4 class="you-are">You are...</h4>
                    <h2 class="result-type">${selectedLeBron.name}</h2>
                </div>
                <div class="image-container-question">
                    <img class="lebron-james-quiz-image"
                        src="${selectedLeBron.image}"
                        alt="${selectedLeBron.name}">
                </div>
            </div>
            <div class="bottom-stuff-2">
                <div class="bar-results">
                    <div class="lebron-description-short">
                        ${selectedLeBron.description}
                    </div>
                </div>
                <div class="full-report-found">
                    Be le-inspired by clicking <a
                        href="https://youtube.com/shorts/-pcw8TMlO_o?si=9SuAIW6953Wgq4Cp"
                        class="report-link">here</a>.
                </div>
                <div class="two-buttons">
                    <button class="retake-quiz">Retake Le-Quiz</button>
                    <button class="share-with-lefriends">Share with Le-Friends</button>
                </div>
            </div>
        `;

        const retakeButton = document.querySelector('.retake-quiz');
        retakeButton.addEventListener('click', () => {
            location.reload();
        });

        const shareButton = document.querySelector('.share-with-lefriends');
        shareButton.addEventListener('click', () => {
            const shareText = `Take the Le-Quiz with me and find out which LeBron you are!`;
            const shareUrl = "https://google.com";

            if (navigator.share) {
                navigator.share({
                    title: "Le-Quiz",
                    text: shareText,
                    url: shareUrl
                })
                    .then(() => {
                        console.log('Content shared successfully!');
                    })
                    .catch(err => {
                        console.error('Error sharing content:', err);
                    });
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
                    .then(() => {
                        alert('Link copied to clipboard!');
                    })
                    .catch(err => {
                        console.error('Failed to copy text:', err);
                    });
            } else {
                alert('Sharing is not supported on this device. Please copy the link manually.');
            }
        });
    }
});
