let currentUtterance = null;

export async function speak(text) {
    if (!text) return;

    speechSynthesis.cancel();

    currentUtterance = new SpeechSynthesisUtterance(text);

    currentUtterance.lang = "en-US";
    currentUtterance.rate = 1;
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;

    speechSynthesis.speak(currentUtterance);
}

export function pause() {
    if (speechSynthesis.speaking) {
        speechSynthesis.pause();
    }
}

export function resume() {
    if (speechSynthesis.paused) {
        speechSynthesis.resume();
    }
}

export function stop() {
    speechSynthesis.cancel();
}

export function setRate(rate) {
    if (currentUtterance) {
        currentUtterance.rate = rate;
    }
}

export async function summarize(markdown) {
    throw new Error("Not implemented");
}