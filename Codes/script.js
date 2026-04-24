// ==========================================
// 1. CONSTANTS & SYSTEM VARIABLES
// ==========================================

// Motor rotasyon gösterge sabitleri (Açısal hesaplamalar için)
const ROTATION_START_ANGLE = 0; 
const ROTATION_END_ANGLE = 211.5;
const PERCENTAGE_DIVISOR = ROTATION_END_ANGLE / 2; 

// Eylemsizlik (Inertia) Sabitleri
const BASE_INERTIA = 10 * Math.pow(10, -3);
let currentInertiaFactor = BASE_INERTIA;

// Yakıt Kapasite Sabitleri
const MAX_FUEL_WING = 8500;
const MAX_FUEL_CENTER = 24000;
const FUEL_UPDATE_INTERVAL_MS = 10000; // Tüketim oranını hesaplarken kullanılan simülasyon adımı
const FUEL_CONSUME_TICK_MS = 1000;     // Döngü güncelleme hızı
const KG_CONVERSION = 0.453592;

// Başlangıçta ekranda görünmeyecek olan EICAS hata/uyarı elementlerinin listesi
const ELEMENTS_TO_HIDE_INITIALLY = [
    'mode_r_to', 'mode_r_crz', 'mode_to', 'mode_clb', 'mode_crz', 'mode_ga', 'mode_con', 'mode_---', 'mode_at_lim',
    'lop_bg', 'lop_text', 'svo_bg', 'svo_text', 'ofb_bg', 'ofb_text', 'thrust_bg', 'thrust_text', 'low_fuel_bg', 'low_fuel_text',
    'lop_bg2', 'lop_text2', 'svo_bg2', 'svo_text2', 'ofb_bg2', 'ofb_text2', 'thrust_bg2', 'thrust_text2', 'low_fuel_bg2', 'low_fuel_text2',
    'rev_text_left', 'rev_text_right',
    'eng_fail_text_l', 'eng_fail_text_r',
    'crossbleed_text', 'low_text'
];

// ==========================================
// 2. STATE (DURUM) DEĞİŞKENLERİ
// ==========================================

// --- Yakıt Durumu ---
let fuelLevelLeftWing = MAX_FUEL_WING;
let fuelLevelRightWing = MAX_FUEL_WING;
let fuelLevelCenter = MAX_FUEL_CENTER;
let fuelFlowRateLeft = 0;
let fuelFlowRateRight = 0;
let fuelBurnMultiplier = 1.0;
let currentFuelUnit = 'LB';

// --- Motor & Sistem Metrikleri ---
let currentEgtLeft = 100;
let currentEgtRight = 100;

let currentN2Left = 0;
let currentN2Right = 0;

let currentOilTempLeft = 40;
let currentOilTempRight = 40;

let currentOilPressLeft = 0;
let currentOilPressRight = 0;

let currentOilQtyLeft = 18.0;
let currentOilQtyRight = 18.0;
let targetOilQtyLeft = 18.0;
let targetOilQtyRight = 18.0;

let currentThrottleTargetLeft = 0;
let currentThrottleTargetRight = 0;
let currentThrottleLeft = 0;
let currentThrottleRight = 0;

let n1ReferenceValue = 96.0;
let currentTempUnit = 'C';

// --- Arıza ve Aktifleşen Durumlar ---
let isReverserActiveLeft = false;
let isReverserActiveRight = false;

let isEngineFailLeft = false, isEngineFailRight = false;
let isSvoFailLeft = false, isSvoFailRight = false;
let isOfbFailLeft = false, isOfbFailRight = false;
let isLopFailLeft = false, isLopFailRight = false;
let isThrustFailLeft = false, isThrustFailRight = false;

let isSysCrossbleed = false;
let isSysLowOil = false;

// İlk açılışta EICAS arızalarının doğrudan yanmaması için bir bloklayıcı
let areAlertsInhibited = true;
setTimeout(() => { areAlertsInhibited = false; }, 1500);

// Aynı hatanın art arda animasyonunu engellemek için zamanlayıcıları takip ederiz
const warningTimers = {};

// ==========================================
// 3. BAŞLANGIÇ TEMİZLİĞİ VE YARDIMCI FONKSİYONLAR
// ==========================================

function resetSystemUI() {
    ELEMENTS_TO_HIDE_INITIALLY.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}
// Uygulama yüklendiğinde gizlenmesi gerekenleri gizle
resetSystemUI();

// Toggle widget başlangıç durumunu ayarla
document.addEventListener('DOMContentLoaded', () => {
    // Fuel unit: LB başlangıç
    const fuSlider = document.getElementById('fuel-unit-slider');
    const fuLb = document.getElementById('fuel-opt-lb');
    if (fuSlider) fuSlider.classList.remove('right');
    if (fuLb) fuLb.classList.add('active');
    // Temp unit: C başlangıç
    const tuSlider = document.getElementById('temp-unit-slider');
    const tuC = document.getElementById('temp-opt-c');
    if (tuSlider) tuSlider.classList.remove('right');
    if (tuC) tuC.classList.add('active');
});

function toggleVisibility(elementIds) {
    elementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
        }
    });
}

// Birim değiştirme fonksiyonu
function toggleFuelUnit() {
    currentFuelUnit = currentFuelUnit === 'LB' ? 'KG' : 'LB';
    updateTextContent('val_fuel_unit_text', currentFuelUnit);
    
    // Animated toggle widget güncelle
    const slider = document.getElementById('fuel-unit-slider');
    const optLb = document.getElementById('fuel-opt-lb');
    const optKg = document.getElementById('fuel-opt-kg');
    if (slider) slider.classList.toggle('right', currentFuelUnit === 'KG');
    if (optLb) optLb.classList.toggle('active', currentFuelUnit === 'LB');
    if (optKg) optKg.classList.toggle('active', currentFuelUnit === 'KG');

    updateFuelDisplay();
}

function updateTextContent(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateRotationAngle(id, angle, sweepId) {
    const el = document.getElementById(id);
    if (el) el.style.transform = `rotate(${angle}deg)`;

    // İbrenin taradığı (swept) alanı SVG içerisinde güncelleme işlemi
    if (sweepId) {
        const sweepEl = document.getElementById(sweepId);
        if (sweepEl) {
            const circumference = 19.922; // 2 * Math.PI * 3.1706 (çemberin tam çevresi)
            const offset = circumference - (circumference * (angle / 360));
            sweepEl.style.strokeDashoffset = offset;
        }
    }
}

// ==========================================
// 4. MOTOR METRİKLERİ VE LİMİT KONTROLLERİ
// ==========================================

function checkEngineLimits(side, n1, n2, egt, vib, press, temp) {
    // İç fonksiyon: Ayrıştırılmış class yapısına göre renk güncellemesi yapar
    function applyColorClass(textId, needleId, value, limitAmberTop, limitRedTop, limitAmberBot, limitRedBot) {
        const textEl = document.getElementById(textId);
        const needleEl = needleId ? document.getElementById(needleId) : null;

        if (!textEl) return;

        // Eski sınır renklerini sıfırla
        textEl.classList.remove('eicas-text-amber', 'eicas-text-red');
        if (needleEl) needleEl.classList.remove('eicas-needle-amber', 'eicas-needle-red');

        let isRed = false;
        let isAmber = false;

        // Limit aşımı kontrolleri
        if (limitRedTop !== null && value >= limitRedTop) isRed = true;
        if (limitRedBot !== null && value <= limitRedBot) isRed = true;

        if (!isRed) {
            if (limitAmberTop !== null && value >= limitAmberTop) isAmber = true;
            if (limitAmberBot !== null && value <= limitAmberBot) isAmber = true;
        }

        // Renklendirme sınıflarını uygula
        if (isRed) {
            textEl.classList.add('eicas-text-red');
            if (needleEl) needleEl.classList.add('eicas-needle-red');
        } else if (isAmber) {
            textEl.classList.add('eicas-text-amber');
            if (needleEl) needleEl.classList.add('eicas-needle-amber');
        }
    }

    const sideLower = side.toLowerCase(); 

    // Motor Verileri Limit Kontrolleri
    applyColorClass(`val_n1_${sideLower}`, `n1_needle_${sideLower}`, n1, null, 104.0, null, null);
    applyColorClass(`val_n2_${sideLower}`, null, n2, null, 104.5, null, null);

    const egtNeedle = side === 'L' ? 'egt_left_needle' : 'egt_right_needle';
    applyColorClass(`val_egt_${sideLower}`, egtNeedle, egt, 640, 665, null, null);
    
    applyColorClass(`val_oil_press_${sideLower}`, null, press, null, null, 13, 0);
    applyColorClass(`val_oil_temp_${sideLower}`, null, temp, 140, 155, null, null);

    // Titreşim (VIB) Inverted Durumu
    const vibText = document.getElementById(`val_vib_${sideLower}`);
    if (vibText) {
        if (vib >= 4.0) vibText.classList.add('vib-inverted');
        else vibText.classList.remove('vib-inverted');
    }
}

// Ana EICAS animasyon çerçevesini hesaplayan mantıksal yapı
function updateEngineState(throttleValue, side) {
    const throttle = Math.min(parseFloat(throttleValue), 105);
    const n1 = throttle;
    const ff = throttle * 14.2; 
    const vib = throttle * 0.015;
    
    // Total Air Temperature
    const tat = -12 + (throttle * 0.1); 
    updateTextContent('val_tat', tat.toFixed(1));

    let targetN2 = throttle > 0 ? throttle * 0.8 + 20 : 0; 
    let targetEgt = 100 + (throttle * 5.5);
    let targetOilPress = throttle > 0 ? 30 + (throttle * 0.6) : 0;
    let targetOilTemp = 40 + (throttle * 0.8);

    const qty = (side === 'L') ? currentOilQtyLeft : currentOilQtyRight;
    const oilLossRatio = Math.max(0, (18.0 - qty) / 18.0);
    
    targetOilTemp += (45 * oilLossRatio);   
    targetOilPress -= (10 * oilLossRatio);  

    if (isSysCrossbleed) targetEgt += 15; 
    
    if (side === 'L') {
        fuelFlowRateLeft = ff;
        
        // Sol Motor Arızaları
        if (isSvoFailLeft) { targetN2 += 4.5; targetEgt += 25; } 
        if (isOfbFailLeft) { targetOilTemp += 35; targetOilPress -= 8; } 
        if (isLopFailLeft) { targetOilPress = throttle > 0 ? Math.min(targetOilPress, 12) : 0; } 
        
        targetOilPress = Math.max(0, targetOilPress);

        // Atalet (Inertia) değerlerinin güncellenmesi
        currentN2Left += (targetN2 - currentN2Left) * currentInertiaFactor;
        currentOilTempLeft += (targetOilTemp - currentOilTempLeft) * (currentInertiaFactor * 0.2); 
        currentOilPressLeft += (targetOilPress - currentOilPressLeft) * (currentInertiaFactor * 2.0); 
        currentEgtLeft += (targetEgt - currentEgtLeft) * (currentInertiaFactor * 0.3);
        currentOilQtyLeft += (targetOilQtyLeft - currentOilQtyLeft) * (currentInertiaFactor * 0.1);

        updateRotationAngle('n1_needle_l', (throttle / PERCENTAGE_DIVISOR) * ROTATION_END_ANGLE, 'n1_left_sweep');
        updateRotationAngle('egt_left_needle', ((currentEgtLeft - 100) / 5.5 / PERCENTAGE_DIVISOR) * ROTATION_END_ANGLE, 'egt_left_sweep');
        
        updateTextContent('val_n1_l', n1.toFixed(1));
        updateTextContent('val_egt_l', currentEgtLeft.toFixed(0));
        updateTextContent('val_oil_press_l', currentOilPressLeft.toFixed(0));
        updateTextContent('val_oil_temp_l', currentOilTempLeft.toFixed(0));
        updateTextContent('val_oil_qty_l', currentOilQtyLeft.toFixed(0));
        updateTextContent('val_n2_l', currentN2Left.toFixed(1));
        updateTextContent('val_ff_l', ff.toFixed(1));
        updateTextContent('val_vib_l', vib.toFixed(1));

        checkEngineLimits('L', n1, currentN2Left, currentEgtLeft, vib, currentOilPressLeft, currentOilTempLeft);

    } else {
        fuelFlowRateRight = ff;

        // Sağ Motor Arızaları
        if (isSvoFailRight) { targetN2 += 4.5; targetEgt += 25; }
        if (isOfbFailRight) { targetOilTemp += 35; targetOilPress -= 8; }
        if (isLopFailRight) { targetOilPress = throttle > 0 ? Math.min(targetOilPress, 12) : 0; }
        
        targetOilPress = Math.max(0, targetOilPress);

        // Atalet (Inertia) değerlerinin güncellenmesi
        currentN2Right += (targetN2 - currentN2Right) * currentInertiaFactor;
        currentOilTempRight += (targetOilTemp - currentOilTempRight) * (currentInertiaFactor * 0.2); 
        currentOilPressRight += (targetOilPress - currentOilPressRight) * (currentInertiaFactor * 2.0); 
        currentEgtRight += (targetEgt - currentEgtRight) * (currentInertiaFactor * 0.3);
        currentOilQtyRight += (targetOilQtyRight - currentOilQtyRight) * (currentInertiaFactor * 0.1);

        updateRotationAngle('n1_needle_r', (throttle / PERCENTAGE_DIVISOR) * ROTATION_END_ANGLE, 'n1_right_sweep');
        updateRotationAngle('egt_right_needle', ((currentEgtRight - 100) / 5.5 / PERCENTAGE_DIVISOR) * ROTATION_END_ANGLE, 'egt_right_sweep');
        
        updateTextContent('val_n1_r', n1.toFixed(1));
        updateTextContent('val_egt_r', currentEgtRight.toFixed(0));
        updateTextContent('val_oil_press_r', currentOilPressRight.toFixed(0));
        updateTextContent('val_oil_temp_r', currentOilTempRight.toFixed(0));
        updateTextContent('val_oil_qty_r', currentOilQtyRight.toFixed(0)); 
        updateTextContent('val_n2_r', currentN2Right.toFixed(1));
        updateTextContent('val_ff_r', ff.toFixed(1));
        updateTextContent('val_vib_r', vib.toFixed(1));

        checkEngineLimits('R', n1, currentN2Right, currentEgtRight, vib, currentOilPressRight, currentOilTempRight);
    }
}

// ==========================================
// 5. ARIZA / UYARI TETİKLEYİCİLERİ
// ==========================================

function triggerEICASWarning(elementId, activate) {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Elemanın metin olup olmadığını ID üzerinden tespit et
    const isText = elementId.includes('text');
    const blinkClass = isText ? 'eicas-blink-black' : 'eicas-blink-amber';
    const steadyClass = isText ? 'eicas-steady-black' : 'eicas-steady-amber';

    if (activate) {
        if (el.classList.contains(blinkClass) || el.classList.contains(steadyClass)) return;

        el.classList.add(blinkClass);
        el.style.display = 'block';

        // 10 saniye sonunda flaşlama durur, sabit duruma geçer
        warningTimers[elementId] = setTimeout(() => {
            if (el.classList.contains(blinkClass)) {
                el.classList.remove(blinkClass);
                el.classList.add(steadyClass);
            }
        }, 10000);
    } else {
        clearTimeout(warningTimers[elementId]);
        el.classList.remove(blinkClass, steadyClass);
        el.style.display = 'none'; 
    }
}

function toggleFailure(type, side) {
    if (type === 'eng') {
        if (side === 'L') { isEngineFailLeft = !isEngineFailLeft; document.getElementById('eng_fail_text_l').style.display = isEngineFailLeft ? 'inline' : 'none'; }
        if (side === 'R') { isEngineFailRight = !isEngineFailRight; document.getElementById('eng_fail_text_r').style.display = isEngineFailRight ? 'inline' : 'none'; }
    }
    else if (type === 'svo') {
        if (side === 'L') { isSvoFailLeft = !isSvoFailLeft; toggleVisibility(['svo_bg', 'svo_text']); }
        if (side === 'R') { isSvoFailRight = !isSvoFailRight; toggleVisibility(['svo_bg2', 'svo_text2']); }
    }
    else if (type === 'ofb') {
        if (side === 'L') { isOfbFailLeft = !isOfbFailLeft; toggleVisibility(['ofb_bg', 'ofb_text']); }
        if (side === 'R') { isOfbFailRight = !isOfbFailRight; toggleVisibility(['ofb_bg2', 'ofb_text2']); }
    }
    else if (type === 'lop') {
        if (side === 'L') { isLopFailLeft = !isLopFailLeft; }
        if (side === 'R') { isLopFailRight = !isLopFailRight; }
    }
    else if (type === 'thrust') {
        if (side === 'L') { isThrustFailLeft = !isThrustFailLeft; }
        if (side === 'R') { isThrustFailRight = !isThrustFailRight; }
    }
    else if (type === 'lowFuel') {
        if (side === 'L') { fuelLevelLeftWing = Math.min(fuelLevelLeftWing, 1500); updateFuelDisplay(); }
        if (side === 'R') { fuelLevelRightWing = Math.min(fuelLevelRightWing, 1500); updateFuelDisplay(); }
    }
    else if (type === 'xb') {
        isSysCrossbleed = !isSysCrossbleed; 
        toggleVisibility(['crossbleed_text']);
    }
    else if (type === 'lo') {
        isSysLowOil = !isSysLowOil; 
        toggleVisibility(['low_text']);
        if (isSysLowOil) {
            targetOilQtyLeft = 3.5;
            targetOilQtyRight = 3.5;
        } else {
            targetOilQtyLeft = 18.0;
            targetOilQtyRight = 18.0;
        }
    }

    // Yağ basıncı tetikleyicisi uyarısını (blink mekanizmasını) güncelleyelim
    triggerEICASWarning('lop_bg', isLopFailLeft);
    triggerEICASWarning('lop_text', isLopFailLeft);
    triggerEICASWarning('lop_bg2', isLopFailRight);
    triggerEICASWarning('lop_text2', isLopFailRight);
}

// ==========================================
// 6. UI KONTROL ETKİLEŞİMLERİ & DOM ELEMENTS
// ==========================================

function toggleReverser(side) {
    if (side === 'L') {
        isReverserActiveLeft = !isReverserActiveLeft;
        document.getElementById('rev_text_left').style.display = isReverserActiveLeft ? 'inline' : 'none';
        document.getElementById('val_n1_ref_l').style.display = isReverserActiveLeft ? 'none' : 'inline';
        const bugL = document.getElementById('n1_ref_bug_l');
        if (bugL) bugL.style.display = isReverserActiveLeft ? 'none' : 'inline';
    } else {
        isReverserActiveRight = !isReverserActiveRight;
        document.getElementById('rev_text_right').style.display = isReverserActiveRight ? 'inline' : 'none';
        document.getElementById('val_n1_ref_r').style.display = isReverserActiveRight ? 'none' : 'inline';
        const bugR = document.getElementById('n1_ref_bug_r');
        if (bugR) bugR.style.display = isReverserActiveRight ? 'none' : 'inline';
    }
}

function setFlightMode(activeModeId) {
    const flightModes = [
        'mode_r_to', 'mode_r_crz', 'mode_to', 'mode_clb', 'mode_crz', 
        'mode_ga', 'mode_con', 'mode_---', 'mode_at_lim'
    ];
    
    flightModes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (activeModeId !== 'NONE') {
        const activeEl = document.getElementById(activeModeId);
        if (activeEl) activeEl.style.display = 'block';
    }
}

// Sıcaklık ayarları
const tempSlider = document.getElementById('sel-temp-slider');

function toggleTemperatureUnit() {
    currentTempUnit = currentTempUnit === 'C' ? 'F' : 'C';
    
    // Animated toggle widget güncelle
    const slider = document.getElementById('temp-unit-slider');
    const optC = document.getElementById('temp-opt-c');
    const optF = document.getElementById('temp-opt-f');
    if (slider) slider.classList.toggle('right', currentTempUnit === 'F');
    if (optC) optC.classList.toggle('active', currentTempUnit === 'C');
    if (optF) optF.classList.toggle('active', currentTempUnit === 'F');

    updateTemperatureDisplay();
}

function updateTemperatureDisplay() {
    const tempEl = document.getElementById('sel_temp_value');
    if (!tempEl) return;

    const celsiusVal = parseFloat(tempSlider.value);
    
    if (currentTempUnit === 'F') {
        const fahrenheitVal = Math.round((celsiusVal * 9/5) + 32);
        tempEl.textContent = fahrenheitVal + 'F';
    } else {
        tempEl.textContent = celsiusVal + 'C';
    }
}

if (tempSlider) {
    tempSlider.addEventListener('input', updateTemperatureDisplay);
    updateTemperatureDisplay(); 
}

// N1 Referans Ayarları
const n1RefSlider = document.getElementById('n1-ref-slider');
const n1RefValInput = document.getElementById('n1-ref-val');

function updateN1ReferenceBug() {
    updateTextContent('val_n1_ref_l', n1ReferenceValue.toFixed(1));
    updateTextContent('val_n1_ref_r', n1ReferenceValue.toFixed(1));
    
    // Açı en fazla 105 üzerinden hesaplansın
    const visualRef = Math.min(n1ReferenceValue, 105);
    const percentage = visualRef / PERCENTAGE_DIVISOR;
    const refAngle = ROTATION_START_ANGLE + (percentage * (ROTATION_END_ANGLE - ROTATION_START_ANGLE));
    
    const bugL = document.getElementById('n1_ref_bug_l');
    const bugR = document.getElementById('n1_ref_bug_r');
    if (bugL) bugL.style.transform = `rotate(${refAngle}deg)`;
    if (bugR) bugR.style.transform = `rotate(${refAngle}deg)`;
}

if (n1RefSlider) {
    n1RefSlider.addEventListener('input', (e) => {
        n1ReferenceValue = parseFloat(e.target.value);
        if (n1RefValInput) n1RefValInput.value = n1ReferenceValue.toFixed(1);
        updateN1ReferenceBug();
    });
    updateN1ReferenceBug(); 
}

if (n1RefValInput) {
    n1RefValInput.addEventListener('change', (e) => {
        const val = Math.min(105, Math.max(0, parseFloat(e.target.value) || 0));
        n1ReferenceValue = val;
        n1RefSlider.value = val;
        e.target.value = val.toFixed(1);
        updateN1ReferenceBug();
    });
}

// Motor (Throttle) Slider Dinleyicileri
const sliderLeft = document.getElementById('throttle-L');
const sliderRight = document.getElementById('throttle-R');
const throttleValInputLeft = document.getElementById('throttle-val-L');
const throttleValInputRight = document.getElementById('throttle-val-R');

if (sliderLeft) {
    sliderLeft.addEventListener('input', (e) => { 
        if (!isThrustFailLeft) {
            currentThrottleTargetLeft = parseFloat(e.target.value); 
            if (throttleValInputLeft) throttleValInputLeft.value = currentThrottleTargetLeft.toFixed(1);
        } else {
            e.target.value = currentThrottleTargetLeft; 
        }
    });
}

if (sliderRight) {
    sliderRight.addEventListener('input', (e) => { 
        if (!isThrustFailRight) {
            currentThrottleTargetRight = parseFloat(e.target.value); 
            if (throttleValInputRight) throttleValInputRight.value = currentThrottleTargetRight.toFixed(1);
        } else {
            e.target.value = currentThrottleTargetRight; 
        }
    });
}

if (throttleValInputLeft) {
    throttleValInputLeft.addEventListener('change', (e) => {
        if (!isThrustFailLeft) {
            const val = Math.min(105, Math.max(0, parseFloat(e.target.value) || 0));
            currentThrottleTargetLeft = val;
            sliderLeft.value = val;
            e.target.value = val.toFixed(1);
        } else {
            e.target.value = currentThrottleTargetLeft.toFixed(1);
        }
    });
}

if (throttleValInputRight) {
    throttleValInputRight.addEventListener('change', (e) => {
        if (!isThrustFailRight) {
            const val = Math.min(105, Math.max(0, parseFloat(e.target.value) || 0));
            currentThrottleTargetRight = val;
            sliderRight.value = val;
            e.target.value = val.toFixed(1);
        } else {
            e.target.value = currentThrottleTargetRight.toFixed(1);
        }
    });
}

// Sistem Çarpanları Ayarları
const fuelMultSlider = document.getElementById('fuel-mult-slider');
const inertiaMultSlider = document.getElementById('inertia-mult-slider');
const fuelMultValInput = document.getElementById('fuel-mult-val');
const inertiaMultValInput = document.getElementById('inertia-mult-val');

if (fuelMultSlider) {
    fuelMultSlider.addEventListener('input', (e) => {
        fuelBurnMultiplier = parseFloat(e.target.value);
        if (fuelMultValInput) fuelMultValInput.value = fuelBurnMultiplier.toFixed(1);
    });
}

if (fuelMultValInput) {
    fuelMultValInput.addEventListener('change', (e) => {
        let val = parseFloat(e.target.value) || 1.0;
        val = Math.min(10, Math.max(0.1, val));
        fuelBurnMultiplier = val;
        fuelMultSlider.value = val;
        e.target.value = val.toFixed(1);
    });
}

if (inertiaMultSlider) {
    inertiaMultSlider.addEventListener('input', (e) => {
        const inertiaMultiplier = parseFloat(e.target.value);
        if (inertiaMultValInput) inertiaMultValInput.value = inertiaMultiplier.toFixed(1);
        currentInertiaFactor = BASE_INERTIA * inertiaMultiplier;
    });
}

if (inertiaMultValInput) {
    inertiaMultValInput.addEventListener('change', (e) => {
        let val = parseFloat(e.target.value) || 1.0;
        val = Math.min(5, Math.max(0.1, val));
        inertiaMultSlider.value = val;
        e.target.value = val.toFixed(1);
        currentInertiaFactor = BASE_INERTIA * val;
    });
}

// ==========================================
// 7. YAKIT TÜKETİMİ VE MOTOR DÖNGÜSÜ (LOOP)
// ==========================================

function updateFuelDisplay() {
    // Seçili birime göre çarpan belirle
    const mult = currentFuelUnit === 'KG' ? KG_CONVERSION : 1;

    updateTextContent('val_fuel_1', Math.round(fuelLevelLeftWing * mult));
    updateTextContent('val_fuel_2', Math.round(fuelLevelRightWing * mult));
    updateTextContent('val_fuel_ctr', Math.round(fuelLevelCenter * mult));

    const circumference = 2 * Math.PI * 5.4;
    const sweepAngle = 261; 
    const visibleCircumference = circumference * (sweepAngle / 360);

    // Dairesel barlar her zaman içsel (LB) yüzdelik değerlere göre hesaplanır
    const offsetWingLeft = circumference - (visibleCircumference * (fuelLevelLeftWing / MAX_FUEL_WING));
    const offsetWingRight = circumference - (visibleCircumference * (fuelLevelRightWing / MAX_FUEL_WING));
    const offsetCenter = circumference - (visibleCircumference * (fuelLevelCenter / MAX_FUEL_CENTER));

    const arcLeft = document.getElementById('fuel_arc_1');
    const arcRight = document.getElementById('fuel_arc_2');
    const arcCenter = document.getElementById('fuel_arc_ctr');

    if (arcLeft) arcLeft.style.strokeDashoffset = offsetWingLeft;
    if (arcRight) arcRight.style.strokeDashoffset = offsetWingRight;
    if (arcCenter) arcCenter.style.strokeDashoffset = offsetCenter;
}

function consumeFuel() {
    const consumeRateLeft = (fuelFlowRateLeft / 3600) * (FUEL_UPDATE_INTERVAL_MS / 100) * fuelBurnMultiplier;
    const consumeRateRight = (fuelFlowRateRight / 3600) * (FUEL_UPDATE_INTERVAL_MS / 100) * fuelBurnMultiplier;
    
    if (fuelLevelCenter > 0) {
        const requiredAmount = consumeRateLeft + consumeRateRight;
        const takenFromCenter = Math.min(fuelLevelCenter, requiredAmount);
        fuelLevelCenter -= takenFromCenter;
        
        const remainingToFulfill = requiredAmount - takenFromCenter;
        if (remainingToFulfill > 0) {
            fuelLevelLeftWing = Math.max(0, fuelLevelLeftWing - (remainingToFulfill / 2));
            fuelLevelRightWing = Math.max(0, fuelLevelRightWing - (remainingToFulfill / 2));
        }
    } else {
        fuelLevelLeftWing = Math.max(0, fuelLevelLeftWing - consumeRateLeft);
        fuelLevelRightWing = Math.max(0, fuelLevelRightWing - consumeRateRight);
    }

    updateFuelDisplay();
}

// Ana otomatik uyarı yöneticisi
function manageSystemAlerts() {
    if (areAlertsInhibited) return;

    const lopActiveLeft = currentN2Left > 50 && currentOilPressLeft <= 12.5;
    const lopActiveRight = currentN2Right > 50 && currentOilPressRight <= 12.5;
    const lowFuelActiveLeft = fuelLevelLeftWing < 2000;
    const lowFuelActiveRight = fuelLevelRightWing < 2000;

    const setAlertState = (id, isActive) => {
        const el = document.getElementById(id);
        if (el) el.style.display = isActive ? 'inline' : 'none';
    };

    setAlertState('lop_bg', lopActiveLeft);
    setAlertState('lop_text', lopActiveLeft);
    setAlertState('lop_bg2', lopActiveRight);
    setAlertState('lop_text2', lopActiveRight);

    setAlertState('low_fuel_bg', lowFuelActiveLeft);
    setAlertState('low_fuel_text', lowFuelActiveLeft);
    setAlertState('low_fuel_bg2', lowFuelActiveRight);
    setAlertState('low_fuel_text2', lowFuelActiveRight);
    
    setAlertState('thrust_bg', isThrustFailLeft);
    setAlertState('thrust_text', isThrustFailLeft);
    setAlertState('thrust_bg2', isThrustFailRight);
    setAlertState('thrust_text2', isThrustFailRight);
}

// Animasyon ve Motor Mantık Döngüsü
function engineLoop() {
    const isEngineLeftActive = ((fuelLevelLeftWing > 0 || fuelLevelCenter > 0) && !isEngineFailLeft);
    const isEngineRightActive = ((fuelLevelRightWing > 0 || fuelLevelCenter > 0) && !isEngineFailRight);
    
    const effectiveTargetLeft = isEngineLeftActive ? currentThrottleTargetLeft : 0;
    const effectiveTargetRight = isEngineRightActive ? currentThrottleTargetRight : 0;

    currentThrottleLeft += (effectiveTargetLeft - currentThrottleLeft) * currentInertiaFactor;
    currentThrottleRight += (effectiveTargetRight - currentThrottleRight) * currentInertiaFactor;

    if (Math.abs(effectiveTargetLeft - currentThrottleLeft) < 0.01) currentThrottleLeft = effectiveTargetLeft;
    if (Math.abs(effectiveTargetRight - currentThrottleRight) < 0.01) currentThrottleRight = effectiveTargetRight;

    // Slider UI'ını her frame'de ataletsel değerle senkronize et
    // (senaryo modunda targetLeft ≠ currentThrottleLeft olabilir)
    const sliderL = document.getElementById('throttle-L');
    const inputL = document.getElementById('throttle-val-L');
    const sliderR = document.getElementById('throttle-R');
    const inputR = document.getElementById('throttle-val-R');
    
    // Senaryonun aktif olup olmadığını kontrol et
    const isScenarioRunning = scenarioTimeoutIds.length > 0;

    if (isScenarioRunning) {
        // SENARYO MODU: Slider'lar atalet değerini (ivmelenmeyi) takip ederek görsel olarak yavaşça hareket eder
        if (sliderL && document.activeElement !== sliderL) sliderL.value = currentThrottleLeft.toFixed(1);
        if (inputL && document.activeElement !== inputL) inputL.value = currentThrottleLeft.toFixed(1);
        if (sliderR && document.activeElement !== sliderR) sliderR.value = currentThrottleRight.toFixed(1);
        if (inputR && document.activeElement !== inputR) inputR.value = currentThrottleRight.toFixed(1);
    } else {
        // MANUEL MOD: Slider'lar sadece hedeflenen komut değerinde sabit kalır, böylece birbirlerinin hareketini kesmezler
        if (sliderL && document.activeElement !== sliderL) sliderL.value = currentThrottleTargetLeft.toFixed(1);
        if (inputL && document.activeElement !== inputL) inputL.value = currentThrottleTargetLeft.toFixed(1);
        if (sliderR && document.activeElement !== sliderR) sliderR.value = currentThrottleTargetRight.toFixed(1);
        if (inputR && document.activeElement !== inputR) inputR.value = currentThrottleTargetRight.toFixed(1);
    }

    updateEngineState(currentThrottleLeft, 'L');
    updateEngineState(currentThrottleRight, 'R');

    manageSystemAlerts();

    requestAnimationFrame(engineLoop);
}

// ==========================================
// 8. OTOMATİK SENARYO OYNATIMI (FLIGHT SCENARIOS)
// ==========================================

let scenarioTimeoutIds = [];

// JS üzerinden slider'ları ve throttle değerlerini güvenle güncellemek için yardımcı fonksiyon
function setThrottleCommand(side, val) {
    const target = Math.min(105, Math.max(0, val));
    if (side === 'L') {
        if (!isThrustFailLeft) currentThrottleTargetLeft = target;
        // Slider ve input değerini hemen set etmiyoruz — atalet döngüsü güncelleyecek
    } else {
        if (!isThrustFailRight) currentThrottleTargetRight = target;
    }
}

// Senaryo başlangıcında tüm arızaları sıfırlayan fonksiyon
function resetSystemsForScenario() {
    if (isEngineFailLeft) toggleFailure('eng', 'L');
    if (isEngineFailRight) toggleFailure('eng', 'R');
    if (isSvoFailLeft) toggleFailure('svo', 'L');
    if (isSvoFailRight) toggleFailure('svo', 'R');
    if (isOfbFailLeft) toggleFailure('ofb', 'L');
    if (isOfbFailRight) toggleFailure('ofb', 'R');
    if (isLopFailLeft) toggleFailure('lop', 'L');
    if (isLopFailRight) toggleFailure('lop', 'R');
    if (isThrustFailLeft) toggleFailure('thrust', 'L');
    if (isThrustFailRight) toggleFailure('thrust', 'R');
    if (isSysCrossbleed) toggleFailure('xb', 'ALL');
    if (isSysLowOil) toggleFailure('lo', 'ALL');
}

// Devam eden senaryoyu durdurur
function clearScenario() {
    scenarioTimeoutIds.forEach(clearTimeout);
    scenarioTimeoutIds = [];
    document.getElementById('stop_scenario_btn').style.display = 'none';
    const panel = document.getElementById('scenario-panel');
    if (panel) panel.classList.remove('scenario-active');
}

// Seçilen senaryoyu zaman çizelgesine göre çalıştırır
function playScenario(type) {
    clearScenario();
    document.getElementById('stop_scenario_btn').style.display = 'block';
    const panel = document.getElementById('scenario-panel');
    if (panel) panel.classList.add('scenario-active');

    // T=0 (Başlangıç Ayarları)
    resetSystemsForScenario();
    setFlightMode('NONE');
    setThrottleCommand('L', 20); // Rölanti devri
    setThrottleCommand('R', 20);

    // Komut zamanlayıcı yardımcı fonskyon
    const schedule = (delaySec, action) => {
        scenarioTimeoutIds.push(setTimeout(action, delaySec * 1000));
    };

    if (type === 'normal_takeoff') {
        schedule(3, () => {
            setThrottleCommand('L', 50); // Stabilizasyon
            setThrottleCommand('R', 50);
        });
        schedule(8, () => {
            setFlightMode('mode_to'); // Takeoff Power
            setThrottleCommand('L', n1ReferenceValue);
            setThrottleCommand('R', n1ReferenceValue);
        });
        schedule(40, () => {
            setFlightMode('mode_clb'); // Thrust Reduction
            setThrottleCommand('L', 88);
            setThrottleCommand('R', 88);
            clearScenario(); // Senaryo sonu
        });
    } 
    else if (type === 'v1_cut') {
        schedule(3, () => {
            setThrottleCommand('L', 50);
            setThrottleCommand('R', 50);
        });
        schedule(8, () => {
            setFlightMode('mode_to');
            setThrottleCommand('L', n1ReferenceValue);
            setThrottleCommand('R', n1ReferenceValue);
        });
        schedule(25, () => {
            // V1 Cut - Sağ motorda aniden güç kaybı
            if (!isEngineFailRight) toggleFailure('eng', 'R'); 
        });
        schedule(40, () => {
            setFlightMode('mode_con'); // Tek motor tırmanış (Continuous)
            setThrottleCommand('L', n1ReferenceValue); 
            clearScenario();
        });
    }
}

// Yakıt tüketim döngüsü ve Motor Simülasyonunu başlatıyoruz.
setInterval(consumeFuel, FUEL_CONSUME_TICK_MS);
updateFuelDisplay();
engineLoop();