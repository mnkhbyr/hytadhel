/**
 * app.js - Logic for the Road to Success Interactive Learning App
 */

// State Management
let currentLessonId = 1;
let currentTab = 'vocab';
let userAnswers = {};
let courseData = null;
let currentUser = 'Guest';
let savedWords = [];
let showPinyin = false;

// List of known speakers to recognize from the JSON
const knownSpeakers = [
    "大卫", "山本", "安妮", "马丁", "林月", "美爱", "麦克", "小明", 
    "服务员", "售票员", "师傅", "李美爱", "王老师", "张老师", 
    "李小明", "山田", "田中", "安娜", "马克", "小林"
];

// DOM Elements
const lessonSelector = document.getElementById('lesson-selector');
const contentArea = document.getElementById('content-area');
const tabButtons = document.querySelectorAll('.tab-btn');
const themeToggle = document.getElementById('theme-toggle');
const userBtn = document.getElementById('user-btn');
const userNameDisplay = document.getElementById('user-name-display');
const toast = document.getElementById('toast');

// Initialize App
async function init() {
    try {
        loadUserData();
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Failed to load data.json');
        courseData = await response.json();
        
        populateLessonSelector();
        renderLesson();
        setupEventListeners();
        checkTheme();
    } catch (error) {
        console.error("Error loading data:", error);
        contentArea.innerHTML = `<div class="text-content" style="color: #B3261E;">Error loading course data. Please ensure you are running this via a local server.</div>`;
    }
}

// --- User Data Management ---
function loadUserData() {
    const storedUser = localStorage.getItem('hsk_current_user');
    if (storedUser) {
        currentUser = storedUser;
    } else {
        currentUser = 'Guest_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('hsk_current_user', currentUser);
    }
    
    const storedWords = localStorage.getItem(`hsk_saved_${currentUser}`);
    savedWords = storedWords ? JSON.parse(storedWords) : [];
    
    updateUserUI();
}

function updateUserUI() {
    userNameDisplay.textContent = currentUser;
}

function changeUser() {
    const newUser = prompt("Enter your username (words will be saved under this name):", currentUser);
    if (newUser && newUser.trim() !== "" && newUser !== currentUser) {
        currentUser = newUser.trim();
        localStorage.setItem('hsk_current_user', currentUser);
        
        const storedWords = localStorage.getItem(`hsk_saved_${currentUser}`);
        savedWords = storedWords ? JSON.parse(storedWords) : [];
        
        updateUserUI();
        showToast(`Switched to user: ${currentUser}`, 'success');
        renderLesson(); 
    }
}

// --- Word Saving Logic ---
window.toggleSaveWord = function(hanzi) {
    const lesson = courseData.lessons.find(l => l.id === currentLessonId);
    const word = lesson.vocabulary.find(w => w.hanzi === hanzi);
    
    const index = savedWords.findIndex(w => w.hanzi === hanzi);
    
    if (index > -1) {
        savedWords.splice(index, 1);
        showToast('Word removed from saved list', 'info');
    } else {
        savedWords.push(word);
        showToast('Word saved!', 'success');
    }
    
    localStorage.setItem(`hsk_saved_${currentUser}`, JSON.stringify(savedWords));
    
    if (currentTab === 'vocab' || currentTab === 'saved') {
        renderLesson();
    }
};

// --- Pinyin Generation Logic ---
window.togglePinyin = function() {
    showPinyin = !showPinyin;
    renderLesson();
};

function convertToPinyinHTML(text) {
    if (!window.pinyinPro) return text; // Fallback if library fails to load
    
    return text.split('\n').map(line => {
        if (!line.trim()) return '<br>';
        
        let speakerHtml = '';
        let dialogueText = line;
        
        // Check if the line is a dialogue (starts with Name：)
        const speakerMatch = line.match(/^([^：:]+)[：:](.*)/);
        if (speakerMatch && knownSpeakers.includes(speakerMatch[1].trim())) {
            const speakerName = speakerMatch[1].trim();
            speakerHtml = `<span class="speaker-name">${speakerName}：</span>`;
            dialogueText = speakerMatch[2];
        }
        
        // FIXED: Use type: 'all' to get exact character-by-character mapping including punctuation
        const pinyinResult = window.pinyinPro.pinyin(dialogueText, { toneType: 'symbol', type: 'all' });
        let rubyHtml = '';
        
        if (Array.isArray(pinyinResult)) {
            pinyinResult.forEach(item => {
                if (item.isZh) {
                    rubyHtml += `<ruby>${item.origin}<rt>${item.pinyin}</rt></ruby>`;
                } else {
                    // Keep punctuation and spaces intact (Fixes the iOS misalignment bug)
                    rubyHtml += item.origin;
                }
            });
        } else {
            rubyHtml = dialogueText; // Fallback
        }
        
        // If it was a narrative line (no speaker), use a different class
        const lineClass = speakerHtml ? 'dialogue-line' : 'narrative-line';
        return `<div class="${lineClass}">${speakerHtml}${rubyHtml}</div>`;
    }).join('<br>');
}

// --- UI Rendering ---
function populateLessonSelector() {
    if (!courseData || !courseData.lessons) return;
    
    courseData.lessons.forEach(lesson => {
        const option = document.createElement('option');
        option.value = lesson.id;
        option.textContent = `Lesson ${lesson.id}: ${lesson.title_zh} (${lesson.title_en})`;
        lessonSelector.appendChild(option);
    });
    lessonSelector.value = currentLessonId;
}

function setupEventListeners() {
    lessonSelector.addEventListener('change', (e) => {
        currentLessonId = parseInt(e.target.value);
        currentTab = 'vocab'; 
        updateActiveTabUI();
        renderLesson();
    });

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            updateActiveTabUI();
            renderLesson();
        });
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('darkMode', isDark);
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    });

    userBtn.addEventListener('click', changeUser);
}

function checkTheme() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}

function updateActiveTabUI() {
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === currentTab) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
}

function renderLesson() {
    if (!courseData) return;
    const lesson = courseData.lessons.find(l => l.id === currentLessonId);
    if (!lesson) return;

    contentArea.innerHTML = ''; 

    if (currentTab === 'vocab') {
        renderVocabulary(lesson.vocabulary);
    } else if (currentTab === 'text') {
        renderTexts(lesson.texts);
    } else if (currentTab === 'grammar') {
        renderGrammar(lesson.grammar);
    } else if (currentTab === 'self-check') {
        renderSelfCheck(lesson.selfCheck);
    } else if (currentTab === 'saved') {
        renderSavedWords();
    }
}

function renderTexts(texts) {
    const controlContainer = document.createElement('div');
    controlContainer.className = 'text-header-controls';
    
    const pinyinBtn = document.createElement('button');
    pinyinBtn.className = `pinyin-toggle-btn ${showPinyin ? 'active' : ''}`;
    pinyinBtn.innerHTML = showPinyin ? '🔤 Hide Pinyin' : '🈶 Show Pinyin';
    pinyinBtn.onclick = window.togglePinyin;
    
    controlContainer.appendChild(pinyinBtn);
    contentArea.appendChild(controlContainer);

    texts.forEach(text => {
        const container = document.createElement('div');
        container.className = 'text-content';
        
        const title = document.createElement('div');
        title.className = 'text-title';
        title.textContent = text.title;
        container.appendChild(title);

        const body = document.createElement('div');
        if (showPinyin) {
            body.innerHTML = convertToPinyinHTML(text.content);
        } else {
            body.innerHTML = text.content.split('\n').map(line => {
                if (!line.trim()) return '<br>';
                
                for (let speaker of knownSpeakers) {
                    if (line.startsWith(`${speaker}：`) || line.startsWith(`${speaker}:`)) {
                        const rest = line.substring(speaker.length + 1);
                        return `<div class="dialogue-line"><span class="speaker-name">${speaker}：</span>${rest}</div>`;
                    }
                }
                return `<div class="narrative-line">${line}</div>`;
            }).join('');
        }
        
        container.appendChild(body);
        contentArea.appendChild(container);
    });
}

function renderVocabulary(vocabList) {
    const grid = document.createElement('div');
    grid.className = 'word-grid';

    vocabList.forEach(word => {
        const isSaved = savedWords.some(w => w.hanzi === word.hanzi);
        
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="hanzi-text text-3xl font-bold">${word.hanzi}</span>
                <div class="flex items-center gap-2">
                    <span class="badge-pos">${word.pos}</span>
                    <span class="save-icon ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); toggleSaveWord('${word.hanzi}')">★</span>
                </div>
            </div>
            <div class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">${word.pinyin}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">${word.english}</div>
            <div class="text-sm text-gray-500 dark:text-gray-500 italic border-t border-gray-100 dark:border-gray-800 pt-2 mt-auto">
                ${word.mongolian || '-'}
            </div>
        `;
        grid.appendChild(card);
    });

    contentArea.appendChild(grid);
}

function renderSavedWords() {
    if (savedWords.length === 0) {
        contentArea.innerHTML = `
            <div class="text-content" style="text-align: center; color: #6B7280;">
                <p style="font-size: 2rem; margin-bottom: 1rem;">📭</p>
                <p>No saved words yet. Click the ★ icon on any vocabulary card to save it here.</p>
            </div>
        `;
        return;
    }
    
    renderVocabulary(savedWords);
}

function renderGrammar(grammarList) {
    if (!grammarList || grammarList.length === 0) {
        contentArea.innerHTML = '<p class="text-gray-500">No grammar points for this lesson.</p>';
        return;
    }

    grammarList.forEach(grammar => {
        const card = document.createElement('div');
        card.className = 'grammar-card';
        
        let examplesHtml = '';
        grammar.examples.forEach(ex => {
            examplesHtml += `
                <div class="example-item">
                    <div class="example-zh">${ex.zh}</div>
                    <div class="example-en">${ex.en}</div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="grammar-title">${grammar.title}</div>
            <div class="grammar-explanation">${grammar.explanation}</div>
            <div>${examplesHtml}</div>
        `;
        contentArea.appendChild(card);
    });
}

function renderSelfCheck(questions) {
    const wrapper = document.createElement('div');
    wrapper.className = 'self-check-section';

    const card = document.createElement('div');
    card.className = 'self-check-card';

    const title = document.createElement('h2');
    title.textContent = 'Self Check';
    card.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'self-check-subtitle';
    subtitle.textContent = 'Test your understanding of this lesson. Select the correct answer for each question.';
    card.appendChild(subtitle);

    const form = document.createElement('form');
    form.id = 'self-check-form';

    questions.forEach((q) => {
        const group = document.createElement('div');
        group.className = 'self-check-group';
        
        const qText = document.createElement('p');
        qText.style.fontWeight = '600';
        qText.style.marginBottom = '0.5rem';
        qText.textContent = q.question;
        group.appendChild(qText);

        q.options.forEach((opt) => {
            const label = document.createElement('label');
            label.className = 'self-check-option';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = q.id;
            radio.value = opt.charAt(0); 

            if (userAnswers[q.id] === opt.charAt(0)) {
                radio.checked = true;
            }

            const span = document.createElement('span');
            span.textContent = opt;

            label.appendChild(radio);
            label.appendChild(span);
            group.appendChild(label);
        });

        form.appendChild(group);
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'self-check-submit-btn';
    submitBtn.textContent = 'Submit Answers';
    submitBtn.onclick = () => evaluateSelfCheck(questions);
    form.appendChild(submitBtn);

    card.appendChild(form);
    wrapper.appendChild(card);
    contentArea.appendChild(wrapper);
}

function evaluateSelfCheck(questions) {
    let score = 0;
    let total = questions.length;

    questions.forEach(q => {
        const selected = document.querySelector(`input[name="${q.id}"]:checked`);
        if (selected) {
            userAnswers[q.id] = selected.value;
            if (selected.value === q.answer) {
                score++;
            }
        }
    });

    showToast(`You scored ${score} out of ${total}!`, 'success');
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Run the app
document.addEventListener('DOMContentLoaded', init);
