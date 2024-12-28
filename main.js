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

    function showResults(answers) {
        mainContainer.innerHTML = `
            <div class="results-container">
                <h2 class="results-header">Your Results</h2>
                <p class="paragraph-temp">We are still working on the results part, but thank you for taking the Le-Quiz! Check out the Le-Marketplace at the bottom.</p>
            </div>
        `;
        /*
        mainContainer.innerHTML = `
            <div class="results-container">
                <h2 class="results-header">Your Results</h2>
                    <p>You answered the following:</p>
                    <ul>
                        ${answers.map(answer => `<li>${answer}</li>`).join('')}
                    </ul>
                <p>We are still working on the results part, but thank you for taking the Le-Quiz! Check out the Le-Marketplace at the bottom.</p>
            </div>
        `;
        */
    }
});
