'use strict';

const difficultySettings = {
    easy: [35, 5, 60],
    medium: [55, 6, 45],
    hard: [80, 7, 30]
};

const keySets = {
    home: ['A', 'S', 'D', 'F', 'J', 'K', 'L'],
    top: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    all: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
};

const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

function getElement(id) {
    return document.getElementById(id);
}

let selectedMode = '';
let selectedDifficulty = 'easy';
let selectedKeySet = 'home';
let gameStatus = 'idle';

let score = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;
let misses = 0;

let elapsedTime = 0;
let remainingTime = 0;

let bubbles = [];
let currentTarget = '';
let targetShownAt = 0;

let responseTimes = [];

let gameTimer = null;
let animationFrame = null;
let lastFrameTime = 0;

function showScreen(screenId) {

    const screens = [
        'homeScreen',
        'gameScreen',
        'resultsScreen'
    ];

    screens.forEach(id => {
        getElement(id).hidden = id !== screenId;
    });

    window.scrollTo(0, 0);
}

function stopGameLoops() {

    if (gameTimer !== null) {
        clearInterval(gameTimer);
        gameTimer = null;
    }

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    lastFrameTime = 0;
}

function resetGameData() {

    score = 0;
    correctAnswers = 0;
    incorrectAnswers = 0;
    misses = 0;

    elapsedTime = 0;
    remainingTime = 0;

    bubbles = [];
    responseTimes = [];

    currentTarget = '';

    getElement('bubbleField').innerHTML = '';
}

document.querySelectorAll('[data-difficulty]').forEach(button => {

    button.addEventListener('click', () => {

        selectedDifficulty = button.dataset.difficulty;

        document.querySelectorAll('[data-difficulty]').forEach(item => {

            item.classList.toggle(
                'selected',
                item === button
            );

        });

    });

});

function startGame(mode) {

    stopGameLoops();

    resetGameData();

    selectedMode = mode;
    gameStatus = 'playing';

    const settings = difficultySettings[selectedDifficulty];

    const bubbleSpeed = settings[0];
    const bubbleCount = settings[1];
    const gameTime = settings[2];

    getElement('gameModeLabel').textContent =
        selectedMode.toUpperCase();

    getElement('gameDifficultyLabel').textContent =
        selectedDifficulty.toUpperCase();

    getElement('gameTitle').textContent =
        selectedMode === 'bubbles' ? 'Bubbles' : 'KeyMagnet';

    getElement('gameSubtitle').textContent =
        selectedMode === 'bubbles'
            ? 'Press matching letters before they escape.'
            : 'Type the target letter as quickly as possible.';

    getElement('bubblesPanel').hidden =
        selectedMode !== 'bubbles';

    getElement('keyMagnetPanel').hidden =
        selectedMode !== 'keymagnet';


    showScreen('gameScreen');

    if (selectedMode === 'bubbles') {

        for (let i = 0; i < bubbleCount; i++) {

            const startPosition =
                getElement('bubbleField').clientHeight *
                (i + 1) / (bubbleCount + 1);

            createBubble(startPosition);

        }

        animationFrame = requestAnimationFrame(moveBubbles);

    }

    else {

        selectedKeySet = getElement('keySetSelectHome').value;

        getElement('keySetSelectGame').value = selectedKeySet;

        remainingTime = gameTime;

        buildKeyboard();

        chooseNextTarget();

    }


    updateStats();

    startTimer();

}

function startTimer() {

    gameTimer = setInterval(() => {

        if (gameStatus !== 'playing') return;


        if (selectedMode === 'bubbles') {

            elapsedTime++;

        }

        else {

            remainingTime--;

            if (remainingTime <= 0) {

                remainingTime = 0;

                updateStats();

                finishGame();

                return;

            }

        }

        updateStats();

    }, 1000);

}

function formatTime(seconds) {

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

}

function getAccuracy() {

    const total =
        correctAnswers + incorrectAnswers + misses;

    return total === 0
        ? 0
        : Math.round((correctAnswers / total) * 100);

}

function updateStats() {

    getElement('scoreValue').textContent = score;

    if (selectedMode === 'bubbles') {

        getElement('statTwoLabel').textContent = 'MISSES';

        getElement('statTwoValue').textContent =
            `${misses}/6`;

        getElement('statThreeLabel').textContent =
            'ACTIVE BUBBLES';

        getElement('statThreeValue').textContent =
            bubbles.length;

        getElement('statFourLabel').textContent =
            'TIME PLAYED';

        getElement('statFourValue').textContent =
            formatTime(elapsedTime);

    }

    else {

        getElement('statTwoLabel').textContent =
            'TIME LEFT';

        getElement('statTwoValue').textContent =
            formatTime(remainingTime);

        getElement('statThreeLabel').textContent =
            'CORRECT';

        getElement('statThreeValue').textContent =
            correctAnswers;

        getElement('statFourLabel').textContent =
            'INCORRECT';

        getElement('statFourValue').textContent =
            incorrectAnswers;

        const totalTime = responseTimes.reduce(
            (sum, time) => sum + time, 0
        );

        const averageTime =
            totalTime / (responseTimes.length || 1);

        getElement('averageResponseValue').textContent =
            `${Math.round(averageTime)} ms`;

    }

}

function showFeedback(id, message, incorrect = false) {

    const element = getElement(id);

    element.textContent = message;

    element.classList.toggle('wrong', incorrect);

}

function createBubble(startY) {

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const availableLetters = [...alphabet].filter(letter => {

        return !bubbles.some(bubble =>
            bubble.letter === letter
        );

    });


    const letters = availableLetters.length > 0
        ? availableLetters
        : [...alphabet];

    const randomIndex = Math.floor(
        Math.random() * letters.length
    );

    const letter = letters[randomIndex];

    const bubbleElement = document.createElement('div');

    bubbleElement.className = 'bubble';

    bubbleElement.textContent = letter;

    const position = 8 + Math.random() * 84;

    const y = startY ?? getElement('bubbleField').clientHeight + 40;

    bubbleElement.style.left = `${position}%`;

    bubbleElement.style.top = `${y}px`;


    getElement('bubbleField').appendChild(bubbleElement);

    const bubble = {

        letter: letter,

        y: y,

        speed: difficultySettings[selectedDifficulty][0],

        element: bubbleElement

    };

    bubbles.push(bubble);

}

function removeBubble(bubble) {

    bubble.element.remove();

    bubbles = bubbles.filter(item => item !== bubble);

}

function maintainBubbleCount() {

    const extraBubbles = Math.floor(score / 50);

    const requiredCount = Math.min(
        10,
        difficultySettings[selectedDifficulty][1] + extraBubbles
    );


    while (bubbles.length < requiredCount) {

        createBubble();

    }

}

function moveBubbles(timestamp) {

    if (
        gameStatus !== 'playing' ||
        selectedMode !== 'bubbles'
    ) {
        return;
    }

    const deltaTime = lastFrameTime
        ? Math.min((timestamp - lastFrameTime) / 1000, 0.05)
        : 0;

    lastFrameTime = timestamp;

    const speedMultiplier =
        1 + Math.floor(score / 50) * 0.1;


    const missedBubbles = [];


    bubbles.forEach(bubble => {

        bubble.y -=
            bubble.speed * speedMultiplier * deltaTime;

        bubble.element.style.top = `${bubble.y}px`;

        if (bubble.y < -50) {

            missedBubbles.push(bubble);

        }

    });

    missedBubbles.forEach(bubble => {

        removeBubble(bubble);

        misses++;

    });


    if (missedBubbles.length > 0) {

        showFeedback(
            'bubbleFeedback',
            'You missed a bubble!',
            true
        );

        if (misses >= 6) {

            updateStats();

            finishGame();

            return;

        }

        maintainBubbleCount();

    }


    updateStats();

    animationFrame = requestAnimationFrame(moveBubbles);

}

function handleBubbleKey(pressedKey) {

    const matchingBubble = bubbles.find(bubble =>
        bubble.letter === pressedKey
    );


    if (matchingBubble) {

        removeBubble(matchingBubble);

        correctAnswers++;

        score += 10;

        showFeedback(
            'bubbleFeedback',
            'Correct! +10 points.'
        );

        maintainBubbleCount();

    }

    else {

        incorrectAnswers++;

        score = Math.max(0, score - 2);

        showFeedback(
            'bubbleFeedback',
            'Incorrect key! -2 points.',
            true
        );

    }


    updateStats();

}

function buildKeyboard() {

    const keyboard = getElement('keyboardLayout');

    keyboard.innerHTML = '';


    keyboardRows.forEach(row => {

        const rowElement = document.createElement('div');

        rowElement.className = 'keyboard-row';


        row.forEach(letter => {

            const keyElement = document.createElement('div');

            keyElement.className = 'keyboard-key';

            keyElement.textContent = letter;

            keyElement.dataset.key = letter;

            if (keySets[selectedKeySet].includes(letter)) {

                keyElement.classList.add('available');

            }

            if (letter === currentTarget) {

                keyElement.classList.add('target');

            }


            rowElement.appendChild(keyElement);

        });


        keyboard.appendChild(rowElement);

    });

}

function chooseNextTarget() {

    const availableLetters = keySets[selectedKeySet].filter(letter => {

        return letter !== currentTarget;

    });


    const randomIndex = Math.floor(
        Math.random() * availableLetters.length
    );

    currentTarget = availableLetters[randomIndex];

    targetShownAt = performance.now();


    getElement('targetLetter').textContent = currentTarget;

    getElement('targetPrompt').textContent =
        `Press ${currentTarget} on your keyboard`;


    buildKeyboard();

}

function handleMagnetKey(pressedKey) {

    if (pressedKey === currentTarget) {

        const responseTime =
            performance.now() - targetShownAt;

        responseTimes.push(responseTime);

        correctAnswers++;

        score += 10;

        showFeedback(
            'keyFeedback',
            'Correct! +10 points.'
        );

        chooseNextTarget();

    }

    else {

        incorrectAnswers++;

        score = Math.max(0, score - 2);

        showFeedback(
            'keyFeedback',
            'Incorrect key! -2 points.',
            true
        );

    }


    updateStats();

}

function changeKeySet(value) {

    selectedKeySet = value;

    getElement('keySetSelectHome').value = value;

    getElement('keySetSelectGame').value = value;


    if (
        selectedMode === 'keymagnet' &&
        gameStatus === 'playing'
    ) {

        currentTarget = '';

        chooseNextTarget();

    }

}

getElement('keySetSelectHome').addEventListener('change', event => {

    changeKeySet(event.target.value);

});

getElement('keySetSelectGame').addEventListener('change', event => {

    changeKeySet(event.target.value);

});

window.addEventListener('keydown', event => {

    if (gameStatus !== 'playing') return;

    if (event.repeat) return;

    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (
        ['SELECT', 'INPUT', 'TEXTAREA'].includes(
            event.target.tagName
        )
    ) {
        return;
    }


    const pressedKey = event.key.toUpperCase();

    if (!/^[A-Z]$/.test(pressedKey)) return;

    if (selectedMode === 'bubbles') {

        handleBubbleKey(pressedKey);

    }

    else {

        handleMagnetKey(pressedKey);

    }

});

function finishGame() {

    if (gameStatus !== 'playing') return;


    gameStatus = 'ended';

    stopGameLoops();


    const accuracy = getAccuracy();

    getElement('resultsTitle').textContent =
        selectedMode === 'bubbles'
            ? 'Bubbles Game Over!'
            : 'KeyMagnet Complete!';

    getElement('resultsMessage').textContent =
        'Here are your performance results.';

    getElement('finalScoreValue').textContent = score;

    let statistics;


    if (selectedMode === 'bubbles') {

        statistics = [

            ['Correct Bubbles', correctAnswers],

            ['Incorrect Keys', incorrectAnswers],

            ['Missed Bubbles', misses],

            ['Time Played', formatTime(elapsedTime)]

        ];

    }

    else {

        const totalResponseTime = responseTimes.reduce(
            (sum, time) => sum + time, 0
        );

        const averageResponseTime =
            totalResponseTime / (responseTimes.length || 1);


        statistics = [

            ['Correct Responses', correctAnswers],

            ['Incorrect Responses', incorrectAnswers],

            ['Average Response', `${Math.round(averageResponseTime)} ms`],

            ['Time Left', formatTime(remainingTime)]

        ];

    }

    statistics.push(

        ['Accuracy', `${accuracy}%`],

        ['Difficulty', selectedDifficulty.toUpperCase()]

    );

    const resultsContainer = getElement('resultsStats');

    resultsContainer.innerHTML = '';


    statistics.forEach(([label, value]) => {

        const item = document.createElement('div');

        item.className = 'result-item';


        const heading = document.createElement('span');

        heading.textContent = label;


        const result = document.createElement('strong');

        result.textContent = value;


        item.append(heading, result);

        resultsContainer.appendChild(item);

    });


    showScreen('resultsScreen');

}

function backToMenu() {

    stopGameLoops();

    resetGameData();

    gameStatus = 'idle';

    selectedMode = '';

    showScreen('homeScreen');

}

function restartGame() {

    if (selectedMode !== '') {

        startGame(selectedMode);

    }

}

document.querySelectorAll('[data-start-mode]').forEach(button => {

    button.addEventListener('click', event => {

        event.stopPropagation();

        startGame(button.dataset.startMode);

    });

});

document.querySelectorAll('[data-card-mode]').forEach(card => {

    card.addEventListener('click', event => {

        if (event.target.closest('button, select')) return;

        startGame(card.dataset.cardMode);

    });

});

getElement('backToMenuButton').addEventListener('click', backToMenu);

getElement('resetButton').addEventListener('click', backToMenu);

getElement('resultsMenuButton').addEventListener('click', backToMenu);

getElement('restartButton').addEventListener('click', restartGame);

getElement('playAgainButton').addEventListener('click', restartGame);

showScreen('homeScreen');