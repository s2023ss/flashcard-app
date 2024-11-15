// Supabase yapılandırması
const SUPABASE_URL = 'https://jcoqmsqlgqfyffuymfdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjb3Ftc3FsZ3FmeWZmdXltZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2NjYwMjEsImV4cCI6MjA0NDI0MjAyMX0.w_W0dliw7rxzNuoYOFtGZAXFaREwh4vjeOi2AKC2APg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elementlerini seçme
const addWordBtn = document.getElementById('addWordBtn');
const startLearningBtn = document.getElementById('startLearningBtn');
const addWordForm = document.getElementById('addWordForm');
const flashcardArea = document.getElementById('flashcardArea');
const wordInput = document.getElementById('wordInput');
const meaningInput = document.getElementById('meaningInput');
const saveWordBtn = document.getElementById('saveWordBtn');
const wordDisplay = document.getElementById('wordDisplay');
const meaningDisplay = document.getElementById('meaningDisplay');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const flashcard = document.getElementById('flashcard');
const answerOptions = document.getElementById('answerOptions');
const answerButtons = document.querySelectorAll('.answer-btn');
const feedback = document.getElementById('feedback');
const correctCountElement = document.getElementById('correctCount');
const wrongCountElement = document.getElementById('wrongCount');
const successRateElement = document.getElementById('successRate');
const timerElement = document.getElementById('timer');
const learningSection = document.getElementById('learningSection');

// Kelime listesi ve istatistikler için veri yapısı
let words = [];
let currentWordIndex = 0;
let stats = {
    correct: 0,
    wrong: 0
};
let timeLeft = 30;
let timerInterval;

// Supabase'den kelimeleri yükleme
async function loadWords() {
    try {
        const { data, error } = await supabase
            .from('words')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        words = data;
    } catch (error) {
        console.error('Kelimeler yüklenirken hata:', error.message);
        alert('Kelimeler yüklenirken bir hata oluştu!');
    }
}

// Sayfa yüklendiğinde kelimeleri yükle
loadWords();

// Event Listeners
addWordBtn.addEventListener('click', () => {
    addWordForm.classList.remove('hidden');
    flashcardArea.classList.add('hidden');
});

startLearningBtn.addEventListener('click', async () => {
    try {
        await loadWords(); // Kelimeleri yeniden yükle
        if (words.length === 0) {
            alert('Lütfen önce kelime ekleyin!');
            return;
        }
        currentWordIndex = 0;
        stats.correct = 0;
        stats.wrong = 0;
        learningSection.style.display = 'block';
        flashcardArea.classList.remove('hidden');
        addWordForm.classList.add('hidden');
        showCurrentWord();
        startTimer(); // Timer'ı başlat
    } catch (error) {
        console.error('Öğrenme başlatılırken hata:', error);
        alert('Öğrenme başlatılırken bir hata oluştu!');
    }
});

saveWordBtn.addEventListener('click', saveWord);
prevBtn.addEventListener('click', showPreviousWord);
nextBtn.addEventListener('click', showNextWord);

// Flashcard'a tıklama olayını ekliyoruz
flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
});

// Cevap butonlarına tıklama olayları
answerButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const selectedIndex = parseInt(e.target.dataset.index);
        checkAnswer(selectedIndex);
    });
});

// Kelime kaydetme fonksiyonu
async function saveWord() {
    const word = wordInput.value.trim();
    const meaning = meaningInput.value.trim();
    
    if (word === '' || meaning === '') {
        alert('Lütfen kelime ve anlamını girin!');
        return;
    }

    try {
        // Mevcut kelimeyi kontrol et
        const { data: existingWords, error: checkError } = await supabase
            .from('words')
            .select('*')
            .eq('word', word);

        if (checkError) throw checkError;

        if (existingWords.length > 0) {
            alert('Bu kelime zaten mevcut!');
            return;
        }

        console.log('Kelime kaydediliyor:', { word, meaning });
        const { data, error } = await supabase
            .from('words')
            .insert([{ word, meaning }])
            .select();

        if (error) {
            console.error('Supabase hatası:', error);
            throw error;
        }

        console.log('Kayıt başarılı:', data);
        wordInput.value = '';
        meaningInput.value = '';
        
        alert('Kelime başarıyla kaydedildi!');
        await loadWords(); // Kelimeleri yeniden yükle
    } catch (error) {
        console.error('Kelime kaydedilirken hata:', error);
        alert('Kelime kaydedilirken bir hata oluştu: ' + error.message);
    }
}

// Rastgele cevap seçenekleri oluşturma
function generateAnswerOptions(correctMeaning) {
    let options = [correctMeaning];
    let availableWords = words.filter(w => w.meaning !== correctMeaning);
    
    // Yeterli kelime yoksa dummy seçenekler ekle
    while (availableWords.length < 3) {
        availableWords.push({ meaning: `Örnek Anlam ${availableWords.length + 1}` });
    }
    
    // Rastgele 3 yanlış cevap seç
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        options.push(availableWords[randomIndex].meaning);
        availableWords.splice(randomIndex, 1);
    }
    
    // Seçenekleri karıştır
    return shuffleArray(options);
}

// Array karıştırma fonksiyonu
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Cevap kontrolü
function checkAnswer(selectedIndex) {
    const selectedButton = answerButtons[selectedIndex];
    const correctAnswer = words[currentWordIndex].meaning;
    const isCorrect = selectedButton.textContent === correctAnswer;
    
    // İstatistikleri güncelle
    if (isCorrect) {
        stats.correct++;
    } else {
        stats.wrong++;
    }
    updateStats();
    
    // Tüm butonları devre dışı bırak
    answerButtons.forEach(btn => btn.disabled = true);
    
    // Doğru ve yanlış butonları göster
    answerButtons.forEach(btn => {
        if (btn.textContent === correctAnswer) {
            btn.classList.add('correct');
        } else if (btn === selectedButton && !isCorrect) {
            btn.classList.add('wrong');
        }
    });
    
    // Geri bildirim göster
    feedback.textContent = isCorrect ? 'Doğru!' : 'Yanlış! Doğru cevap: ' + correctAnswer;
    feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
    
    // 2 saniye sonra bir sonraki kelimeye geç
    setTimeout(() => {
        if (currentWordIndex < words.length - 1) {
            showNextWord();
        } else {
            alert('Tebrikler! Tüm kelimeleri tamamladınız.');
            currentWordIndex = 0;
            showCurrentWord();
        }
    }, 2000);
}

// İstatistikleri güncelle
function updateStats() {
    correctCountElement.textContent = stats.correct;
    wrongCountElement.textContent = stats.wrong;
    const total = stats.correct + stats.wrong;
    const rate = total === 0 ? 0 : Math.round((stats.correct / total) * 100);
    successRateElement.textContent = `${rate}%`;
}

// Mevcut kelimeyi gösterme fonksiyonu
function showCurrentWord() {
    if (words.length === 0) return;
    
    const currentWord = words[currentWordIndex];
    wordDisplay.textContent = currentWord.word;
    meaningDisplay.textContent = currentWord.meaning;
    
    // Kartı ön yüzüne çevir
    flashcard.classList.remove('flipped');
    
    // Cevap seçeneklerini güncelle
    const options = generateAnswerOptions(currentWord.meaning);
    answerButtons.forEach((btn, index) => {
        btn.textContent = options[index];
        btn.className = 'answer-btn';
        btn.disabled = false;
    });
    
    // Geri bildirimi temizle
    feedback.className = 'feedback';
    feedback.textContent = '';
    
    updateNavigationButtons();
}

// Önceki kelimeyi gösterme
function showPreviousWord() {
    if (currentWordIndex > 0) {
        currentWordIndex--;
        showCurrentWord();
        clearInterval(timerInterval);
        startTimer();
    }
}

// Sonraki kelimeyi gösterme
function showNextWord() {
    if (currentWordIndex < words.length - 1) {
        currentWordIndex++;
        showCurrentWord();
        clearInterval(timerInterval);
        startTimer();
    } else {
        endLearningSession();
    }
}

// Navigasyon butonlarını güncelleme
function updateNavigationButtons() {
    prevBtn.disabled = currentWordIndex === 0;
    nextBtn.disabled = currentWordIndex === words.length - 1;
}

// Timer'ı başlat
function startTimer() {
    timeLeft = 30;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 10) {
            timerElement.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endLearningSession();
        }
    }, 1000);
}

// Timer'ı güncelle
function updateTimerDisplay() {
    timerElement.textContent = timeLeft;
}

// Öğrenme oturumunu bitir
function endLearningSession() {
    clearInterval(timerInterval);
    learningSection.style.display = 'none';
    alert(`Süre bitti!\nDoğru: ${stats.correct}\nYanlış: ${stats.wrong}`);
    // İstatistikleri güncelle
    updateStats();
}
