const targetInput = document.getElementById('targetText');
const resultArea = document.getElementById('resultTag');
const previewText = document.getElementById('previewText');
const setupMessage = document.getElementById('setupMessage');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');
const toast = document.getElementById('toast');
const helpBtn = document.getElementById('helpBtn');
const themeBtn = document.getElementById('themeBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const btnStandard = document.getElementById('tagFormatStandard');
const btnModern = document.getElementById('tagFormatModern');
const bulkEditBtn = document.getElementById('bulkEditBtn');
const mergeModeBtn = document.getElementById('mergeModeBtn');
const mergeControls = document.getElementById('mergeControls');
const executeMergeBtn = document.getElementById('executeMergeBtn');
const cancelMergeBtn = document.getElementById('cancelMergeBtn');
const rubyWarning = document.getElementById('rubyWarning');
const previewContainer = document.getElementById('previewContainer');

const VISUAL_SENSITIVITY = 0.25;
let tokenizer = null;
let activePopup = null;
let currentTagFormat = 'modern';
let isMergeMode = false;
let selectedRubies = [];

const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
};
themeBtn.onclick = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};

const openHelp = () => { helpModal.style.display = 'flex'; setTimeout(() => helpModal.classList.add('active'), 10); };
const closeHelp = () => { helpModal.classList.remove('active'); setTimeout(() => helpModal.style.display = 'none', 500); };
helpBtn.onclick = openHelp;
closeHelpBtn.onclick = closeHelp;

btnStandard.onclick = () => { currentTagFormat = 'standard'; btnStandard.className = "px-3 py-1 text-[10px] bg-slate-200 dark:bg-slate-700 text-current font-bold transition-colors"; btnModern.className = "px-3 py-1 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 font-bold transition-colors"; updateFinalTag(); };
btnModern.onclick = () => { currentTagFormat = 'modern'; btnModern.className = "px-3 py-1 text-[10px] bg-slate-200 dark:bg-slate-700 text-current font-bold transition-colors"; btnStandard.className = "px-3 py-1 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 font-bold transition-colors"; updateFinalTag(); };

const DIC_PATHS = [
    "./dict",
    "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict",
];

function initTokenizer(paths, idx = 0) {
    const dicPath = paths[idx];
    setupMessage.classList.remove('hidden');
    setupMessage.textContent = `辞書データを読み込み中... (${dicPath})`;

    kuromoji.builder({ dicPath }).build((err, _tokenizer) => {
        if (err) {
            if (idx + 1 < paths.length) {
                initTokenizer(paths, idx + 1);
                return;
            }
            setupMessage.textContent =
                "辞書データの読み込みに失敗しました。Cloudflare経由だと外部辞書がブロック/失敗することがあります。"
                + " 対策: このサイトに dict フォルダを同梱して ./dict から読めるようにしてください。";
            return;
        }

        tokenizer = _tokenizer;
        setupMessage.classList.add('hidden');
        // 初期状態でも処理を走らせる（ブラウザのオートコンプリート等への対応）
        if (targetInput.value) processText();
    });
}

initTokenizer(DIC_PATHS);

function katakanaToHiragana(src) { return src.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60)); }
// 「々」(U+3005) は踊り字で、直前の漢字の繰り返しとして実質「漢字ブロック」に含めたい
const isKanjiLike = (ch) => /[\u4E00-\u9FFF]/.test(ch) || ch === '々' || ['ヶ','ヵ','ケ','カ'].includes(ch);
const hasKanjiLike = (s) => [...s].some(isKanjiLike);

function smartSplit(surface, reading) {
    const hiraReading = katakanaToHiragana(reading);
    if (!reading || reading === "*") return { html: surface };
    let htmlResult = "", sIdx = 0, rIdx = 0;
    while (sIdx < surface.length) {
        const char = surface[sIdx];
        if (isKanjiLike(char)) {
            let kanjiBlock = "";
            while (sIdx < surface.length && isKanjiLike(surface[sIdx])) { kanjiBlock += surface[sIdx]; sIdx++; }
            let nextNonKanji = sIdx < surface.length ? surface[sIdx] : null;
            let blockReading = "";
            if (nextNonKanji) {
                let findIdx = hiraReading.indexOf(nextNonKanji, rIdx);
                if (findIdx !== -1) { blockReading = hiraReading.substring(rIdx, findIdx); rIdx = findIdx; }
                else { blockReading = hiraReading.substring(rIdx); rIdx = hiraReading.length; }
            } else { blockReading = hiraReading.substring(rIdx); rIdx = hiraReading.length; }
            const displayReading = blockReading || "●";
            const isMissing = !blockReading;
            const rtClass = isMissing ? ' class="missing-ruby"' : '';
            htmlResult += `<ruby data-reading="${blockReading}" data-size="" data-offset-x="" data-offset-y="">${kanjiBlock}<rt${rtClass}>${displayReading}</rt></ruby>`;
        } else {
            htmlResult += char; sIdx++; if (hiraReading[rIdx] === char) rIdx++;
        }
    }
    return { html: htmlResult };
}

function processText() {
    if (!tokenizer) return;
    const text = targetInput.value.trim();
    if (!text) {
        previewText.classList.add('placeholder-text');
        previewText.innerHTML = '入力待ち...';
        resultArea.value = "";
        rubyWarning.classList.remove('visible');
        return;
    }
    const tokens = tokenizer.tokenize(text);
    let finalHtml = "";
    tokens.forEach(token => {
        const surface = token.surface_form;
        const reading = token.reading || surface;
        if (hasKanjiLike(surface)) finalHtml += smartSplit(surface, reading).html;
        else finalHtml += surface;
    });
    previewText.classList.remove('placeholder-text');
    previewText.innerHTML = finalHtml;
    updateFinalTag();
}

function escapeKanji(text) { return text.replace(/,/g, '\\,'); }

function updateFinalTag() {
    let tag = "";
    let hasMissingRuby = false;
    previewText.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) tag += node.textContent;
        else if (node.tagName === 'RUBY') {
            let kanji = "";
            node.childNodes.forEach(child => { if (child.nodeType === Node.TEXT_NODE) kanji += child.textContent; });
            const escapedKanji = escapeKanji(kanji);
            const reading = node.getAttribute('data-reading');
            const size = node.getAttribute('data-size');
            const offsetX = node.getAttribute('data-offset-x');
            const offsetY = node.getAttribute('data-offset-y');
            if (!reading && reading !== "/") hasMissingRuby = true;
            if (reading === "/") tag += kanji;
            else if (currentTagFormat === 'standard') tag += `<ruby=${reading}>${kanji}</ruby>`;
            else {
                let parts = [escapedKanji, reading];
                if (size || offsetX || offsetY) { parts.push(size); if (offsetX || offsetY) { parts.push(offsetX || "0"); parts.push(offsetY || "0"); } }
                while (parts.length > 2 && parts[parts.length-1] === "") parts.pop();
                tag += `<rb${parts.join(',')}>`;
            }
        }
    });
    resultArea.value = tag;
    if (hasMissingRuby) rubyWarning.classList.add('visible');
    else rubyWarning.classList.remove('visible');
}

function toggleMergeMode() {
    isMergeMode = !isMergeMode;
    selectedRubies = [];
    if (isMergeMode) {
        mergeModeBtn.classList.add('active-mode');
        previewContainer.classList.add('merge-mode-active');
        mergeControls.classList.remove('hidden');
        mergeControls.classList.add('flex');
    } else {
        mergeModeBtn.classList.remove('active-mode');
        previewContainer.classList.remove('merge-mode-active');
        mergeControls.classList.add('hidden');
        mergeControls.classList.remove('flex');
        document.querySelectorAll('.selected-for-merge').forEach(el => el.classList.remove('selected-for-merge'));
    }
}

function splitRuby(rubyEl) {
    let kanjiText = "";
    rubyEl.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) kanjiText += node.textContent; });
    if (kanjiText.length <= 1) return;
    const size = rubyEl.getAttribute('data-size') || "";
    const ox = rubyEl.getAttribute('data-offset-x') || "";
    const oy = rubyEl.getAttribute('data-offset-y') || "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < kanjiText.length; i++) {
        const char = kanjiText[i];
        const newRuby = document.createElement('ruby');
        newRuby.setAttribute('data-reading', "");
        newRuby.setAttribute('data-size', size);
        newRuby.setAttribute('data-offset-x', ox);
        newRuby.setAttribute('data-offset-y', oy);
        const rt = document.createElement('rt');
        rt.textContent = "●";
        rt.classList.add('missing-ruby');
        newRuby.appendChild(document.createTextNode(char));
        newRuby.appendChild(rt);
        fragment.appendChild(newRuby);
    }
    rubyEl.parentNode.replaceChild(fragment, rubyEl);
    updateFinalTag();
}

function mergeSelectedRubies() {
    if (selectedRubies.length < 2) return;
    const sortedRubies = [...selectedRubies].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
    let combinedKanji = "", combinedReading = "";
    sortedRubies.forEach(rb => {
        rb.childNodes.forEach(child => { if (child.nodeType === Node.TEXT_NODE) combinedKanji += child.textContent; });
        const r = rb.getAttribute('data-reading');
        if (r && r !== "/") combinedReading += r;
    });
    const newRuby = document.createElement('ruby');
    newRuby.setAttribute('data-reading', combinedReading);
    newRuby.setAttribute('data-size', "");
    newRuby.setAttribute('data-offset-x', "");
    newRuby.setAttribute('data-offset-y', "");
    const rt = document.createElement('rt');
    rt.textContent = combinedReading || "●";
    if (!combinedReading) rt.classList.add('missing-ruby');
    newRuby.appendChild(document.createTextNode(combinedKanji));
    newRuby.appendChild(rt);
    const first = sortedRubies[0];
    first.parentNode.replaceChild(newRuby, first);
    sortedRubies.slice(1).forEach(rb => rb.remove());
    toggleMergeMode();
    updateFinalTag();
}

mergeModeBtn.onclick = toggleMergeMode;
cancelMergeBtn.onclick = toggleMergeMode;
executeMergeBtn.onclick = mergeSelectedRubies;

const createInput = (label, val, placeholder, withSlash = false) => {
    const wrapper = document.createElement('div'); wrapper.className = 'flex flex-col gap-1';
    const lbl = document.createElement('label'); lbl.textContent = label;
    const inputRow = document.createElement('div'); inputRow.className = 'flex gap-1';
    const inp = document.createElement('input'); inp.value = val || ""; inp.placeholder = placeholder;
    inputRow.appendChild(inp);
    if (withSlash) {
        const slashBtn = document.createElement('button'); slashBtn.textContent = '/'; slashBtn.className = 'btn-slash';
        slashBtn.onclick = (e) => { e.preventDefault(); inp.value = '/'; inp.focus(); };
        inputRow.appendChild(slashBtn);
    }
    wrapper.appendChild(lbl); wrapper.appendChild(inputRow);
    return { wrapper, inp };
};

function applyStylesToRuby(rubyEl, settings) {
    const { reading, size, ox, oy, isBulk } = settings;
    if (!isBulk) rubyEl.setAttribute('data-reading', reading);
    else if (reading === "/") rubyEl.setAttribute('data-reading', "/");
    rubyEl.setAttribute('data-size', size);
    rubyEl.setAttribute('data-offset-x', ox);
    rubyEl.setAttribute('data-offset-y', oy);
    const rt = rubyEl.querySelector('rt');
    const currentReading = rubyEl.getAttribute('data-reading');
    if (currentReading === "/") { rt.style.display = 'none'; rt.classList.remove('missing-ruby'); }
    else {
        rt.style.display = 'block';
        if (currentReading) { rt.textContent = currentReading; rt.classList.remove('missing-ruby'); }
        else { rt.textContent = "●"; rt.classList.add('missing-ruby'); }
    }
    if (size) rt.style.fontSize = `${(parseFloat(size) / 50) * 0.5}em`; else rt.style.fontSize = '';
    const visualX = ox ? parseFloat(ox) * VISUAL_SENSITIVITY : 0;
    const visualY = oy ? parseFloat(oy) * VISUAL_SENSITIVITY : 0;
    rt.style.transform = `translate(${visualX}px, ${visualY}px)`;
}

function showEditorPopup(targetEl, isBulk = false) {
    if (activePopup) activePopup.remove();
    const rect = targetEl.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'edit-popup';
    popup.style.top = `${window.scrollY + rect.bottom + 10}px`;
    popup.style.left = `${window.scrollX + Math.max(10, rect.left - 100)}px`;

    const initialReading = isBulk ? "" : targetEl.getAttribute('data-reading');
    const initialSize = targetEl.getAttribute('data-size') || "";
    const initialOX = targetEl.getAttribute('data-offset-x') || "";
    const initialOY = targetEl.getAttribute('data-offset-y') || "";

    const readingField = createInput('読み方', initialReading, isBulk ? '除外は / ボタン' : 'とうきょう', true);
    if (isBulk) readingField.inp.readOnly = true;
    const sizeField = createInput('サイズ (%)', initialSize, '50');
    const xField = createInput('X位置調整', initialOX, '0');
    const yField = createInput('Y位置調整', initialOY, '0');

    popup.appendChild(readingField.wrapper);
    popup.appendChild(sizeField.wrapper);
    const posRow = document.createElement('div'); posRow.className = 'flex gap-2';
    posRow.appendChild(xField.wrapper); posRow.appendChild(yField.wrapper);
    popup.appendChild(posRow);

    const footer = document.createElement('div'); footer.className = 'popup-footer';
    const saveBtn = document.createElement('button'); saveBtn.textContent = isBulk ? 'すべてに反映' : '確定';
    const cancelBtn = document.createElement('button'); cancelBtn.textContent = '閉じる'; cancelBtn.className = 'btn-popup-cancel';

    let kanjiText = "";
    if (!isBulk) {
        targetEl.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) kanjiText += node.textContent; });
        if (kanjiText.length > 1) {
            const splitBtn = document.createElement('button');
            splitBtn.innerHTML = `<svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm0-5.758a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243z"></path></svg> 分解`;
            splitBtn.className = 'btn-danger-action';
            splitBtn.onclick = () => { splitRuby(targetEl); popup.remove(); activePopup = null; };
            footer.appendChild(splitBtn);
        }
    }

    footer.appendChild(cancelBtn); footer.appendChild(saveBtn);
    popup.appendChild(footer);
    document.body.appendChild(popup);
    activePopup = popup;

    if (!isBulk) readingField.inp.focus(); else sizeField.inp.focus();

    const save = () => {
        const settings = { reading: readingField.inp.value.trim(), size: sizeField.inp.value.trim(), ox: xField.inp.value.trim(), oy: yField.inp.value.trim(), isBulk: isBulk };
        if (isBulk) previewText.querySelectorAll('ruby').forEach(rb => applyStylesToRuby(rb, settings));
        else applyStylesToRuby(targetEl, settings);
        updateFinalTag(); popup.remove(); activePopup = null;
    };
    saveBtn.onclick = save; cancelBtn.onclick = () => { popup.remove(); activePopup = null; };
    popup.onkeydown = (ke) => { if (ke.key === 'Enter') save(); };
}

// --- Event Listeners ---
targetInput.addEventListener('input', processText);

previewText.addEventListener('click', (e) => {
    const rubyEl = e.target.closest('ruby'); if (!rubyEl) return;
    if (isMergeMode) {
        if (selectedRubies.includes(rubyEl)) { selectedRubies = selectedRubies.filter(item => item !== rubyEl); rubyEl.classList.remove('selected-for-merge'); }
        else { selectedRubies.push(rubyEl); rubyEl.classList.add('selected-for-merge'); }
    } else {
        showEditorPopup(rubyEl, false);
    }
});

bulkEditBtn.onclick = () => { if (previewText.querySelector('ruby')) showEditorPopup(bulkEditBtn, true); };
copyBtn.onclick = () => {
    if (!resultArea.value) return;
    resultArea.select(); document.execCommand('copy'); window.getSelection().removeAllRanges();
    resultArea.classList.add('copy-glow'); toast.classList.remove('opacity-0', '-translate-y-4');
    setTimeout(() => { resultArea.classList.remove('copy-glow'); toast.classList.add('opacity-0', '-translate-y-4'); }, 1000);
};
resetBtn.onclick = () => {
    targetInput.value = ""; resultArea.value = ""; previewText.classList.add('placeholder-text'); previewText.innerHTML = '入力待ち...';
    rubyWarning.classList.remove('visible'); if (isMergeMode) toggleMergeMode();
};

window.onload = () => { initTheme(); openHelp(); };
