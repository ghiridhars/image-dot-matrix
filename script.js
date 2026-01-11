// DOM Elements
const imageInput = document.getElementById('imageInput');
const fileName = document.getElementById('fileName');
const dotSizeSlider = document.getElementById('dotSize');
const dotSizeValue = document.getElementById('dotSizeValue');
const spacingSlider = document.getElementById('spacing');
const spacingValue = document.getElementById('spacingValue');
const colorMode = document.getElementById('colorMode');
const customColorGroup = document.getElementById('customColorGroup');
const customColor = document.getElementById('customColor');
const bgColor = document.getElementById('bgColor');
const dotShape = document.getElementById('dotShape');
const sizeByBrightness = document.getElementById('sizeByBrightness');
const originalCanvas = document.getElementById('originalCanvas');
const dotMatrixCanvas = document.getElementById('dotMatrixCanvas');
const hiddenCanvas = document.getElementById('hiddenCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

// Contexts
const originalCtx = originalCanvas.getContext('2d');
const dotMatrixCtx = dotMatrixCanvas.getContext('2d');
const hiddenCtx = hiddenCanvas.getContext('2d');

// State
let currentImage = null;
let isProcessing = false;

// Initialize
function init() {
    setupEventListeners();
    updateSliderValues();
}

function setupEventListeners() {
    imageInput.addEventListener('change', handleImageUpload);
    dotSizeSlider.addEventListener('input', handleControlChange);
    spacingSlider.addEventListener('input', handleControlChange);
    colorMode.addEventListener('change', handleColorModeChange);
    customColor.addEventListener('input', handleControlChange);
    bgColor.addEventListener('input', handleControlChange);
    dotShape.addEventListener('change', handleControlChange);
    sizeByBrightness.addEventListener('change', handleControlChange);
    downloadBtn.addEventListener('click', downloadResult);
    resetBtn.addEventListener('click', resetAll);
}

function updateSliderValues() {
    dotSizeValue.textContent = dotSizeSlider.value;
    spacingValue.textContent = spacingSlider.value;
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    fileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            drawOriginalImage();
            generateDotMatrix();
            downloadBtn.disabled = false;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function drawOriginalImage() {
    if (!currentImage) return;

    const maxWidth = 600;
    const maxHeight = 500;
    
    let width = currentImage.width;
    let height = currentImage.height;
    
    // Scale down if necessary
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
    }

    originalCanvas.width = width;
    originalCanvas.height = height;
    originalCtx.drawImage(currentImage, 0, 0, width, height);
}

function generateDotMatrix() {
    if (!currentImage || isProcessing) return;

    isProcessing = true;

    const spacing = parseInt(spacingSlider.value);
    const dotSize = parseInt(dotSizeSlider.value);
    const mode = colorMode.value;
    const background = bgColor.value;
    const shape = dotShape.value;
    const useBrightnessSize = sizeByBrightness.checked;
    const dotColorCustom = customColor.value;

    // Use hidden canvas for pixel sampling
    const sampleWidth = originalCanvas.width;
    const sampleHeight = originalCanvas.height;
    
    hiddenCanvas.width = sampleWidth;
    hiddenCanvas.height = sampleHeight;
    hiddenCtx.drawImage(currentImage, 0, 0, sampleWidth, sampleHeight);

    // Get image data
    const imageData = hiddenCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;

    // Calculate output dimensions
    const cols = Math.ceil(sampleWidth / spacing);
    const rows = Math.ceil(sampleHeight / spacing);
    const outputWidth = cols * spacing;
    const outputHeight = rows * spacing;

    // Setup output canvas
    dotMatrixCanvas.width = outputWidth;
    dotMatrixCanvas.height = outputHeight;

    // Fill background
    dotMatrixCtx.fillStyle = background;
    dotMatrixCtx.fillRect(0, 0, outputWidth, outputHeight);

    // Generate dots
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * spacing + spacing / 2;
            const y = row * spacing + spacing / 2;

            // Sample pixel at this position
            const sampleX = Math.min(Math.floor(col * spacing), sampleWidth - 1);
            const sampleY = Math.min(Math.floor(row * spacing), sampleHeight - 1);
            const pixelIndex = (sampleY * sampleWidth + sampleX) * 4;

            const r = pixels[pixelIndex];
            const g = pixels[pixelIndex + 1];
            const b = pixels[pixelIndex + 2];
            const a = pixels[pixelIndex + 3];

            // Skip fully transparent pixels
            if (a < 10) continue;

            // Calculate brightness (0-255)
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            
            // Calculate dot size based on brightness
            let currentDotSize = dotSize;
            if (useBrightnessSize) {
                // Darker pixels = larger dots (inverted for better visual effect)
                const sizeFactor = 1 - (brightness / 255);
                currentDotSize = Math.max(1, dotSize * (0.3 + sizeFactor * 0.7));
            }

            // Determine dot color based on mode
            let fillColor;
            switch (mode) {
                case 'color':
                    fillColor = `rgb(${r}, ${g}, ${b})`;
                    break;
                case 'grayscale':
                    fillColor = `rgb(${Math.round(brightness)}, ${Math.round(brightness)}, ${Math.round(brightness)})`;
                    break;
                case 'blackwhite':
                    fillColor = brightness > 128 ? '#ffffff' : '#000000';
                    break;
                case 'custom':
                    fillColor = dotColorCustom;
                    break;
                default:
                    fillColor = `rgb(${r}, ${g}, ${b})`;
            }

            // Draw the dot
            drawDot(dotMatrixCtx, x, y, currentDotSize / 2, fillColor, shape);
        }
    }

    isProcessing = false;
}

function drawDot(ctx, x, y, radius, color, shape) {
    ctx.fillStyle = color;
    ctx.beginPath();

    switch (shape) {
        case 'circle':
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            break;
        case 'square':
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            break;
        case 'diamond':
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x + radius, y);
            ctx.lineTo(x, y + radius);
            ctx.lineTo(x - radius, y);
            ctx.closePath();
            break;
        default:
            ctx.arc(x, y, radius, 0, Math.PI * 2);
    }

    ctx.fill();
}

function handleControlChange() {
    updateSliderValues();
    if (currentImage) {
        generateDotMatrix();
    }
}

function handleColorModeChange() {
    if (colorMode.value === 'custom') {
        customColorGroup.style.display = 'flex';
    } else {
        customColorGroup.style.display = 'none';
    }
    handleControlChange();
}

function downloadResult() {
    if (!currentImage) return;

    const link = document.createElement('a');
    link.download = 'dot-matrix-result.png';
    link.href = dotMatrixCanvas.toDataURL('image/png');
    link.click();
}

function resetAll() {
    currentImage = null;
    fileName.textContent = 'No file selected';
    imageInput.value = '';
    
    // Reset controls to defaults
    dotSizeSlider.value = 6;
    spacingSlider.value = 8;
    colorMode.value = 'blackwhite';
    customColor.value = '#000000';
    bgColor.value = '#000000';
    dotShape.value = 'circle';
    sizeByBrightness.checked = true;
    customColorGroup.style.display = 'none';
    
    updateSliderValues();
    
    // Clear canvases
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    dotMatrixCtx.clearRect(0, 0, dotMatrixCanvas.width, dotMatrixCanvas.height);
    
    originalCanvas.width = 300;
    originalCanvas.height = 200;
    dotMatrixCanvas.width = 300;
    dotMatrixCanvas.height = 200;
    
    downloadBtn.disabled = true;
}

// Debounce function for smoother slider interactions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to expensive operations
const debouncedGenerate = debounce(generateDotMatrix, 50);

// Override handleControlChange for sliders with debounced version
dotSizeSlider.removeEventListener('input', handleControlChange);
spacingSlider.removeEventListener('input', handleControlChange);

dotSizeSlider.addEventListener('input', () => {
    updateSliderValues();
    if (currentImage) debouncedGenerate();
});

spacingSlider.addEventListener('input', () => {
    updateSliderValues();
    if (currentImage) debouncedGenerate();
});

// Initialize the application
init();

// Embed Code Functionality
const embedSection = document.getElementById('embedSection');
const embedCode = document.getElementById('embedCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const embedTabs = document.querySelectorAll('.embed-tab');

let currentEmbedFormat = 'svg';

// Setup embed tab listeners
embedTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        embedTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentEmbedFormat = tab.dataset.format;
        if (currentImage) generateEmbedCode();
    });
});

copyCodeBtn.addEventListener('click', copyEmbedCode);

function generateEmbedCode() {
    if (!currentImage) return;

    let code = '';
    
    switch (currentEmbedFormat) {
        case 'svg':
            code = generateSVGCode();
            break;
        case 'html':
            code = generateHTMLCode();
            break;
        case 'dataurl':
            code = generateDataURLCode();
            break;
    }

    embedCode.textContent = code;
    embedSection.style.display = 'block';
}

function generateSVGCode() {
    const spacing = parseInt(spacingSlider.value);
    const dotSize = parseInt(dotSizeSlider.value);
    const mode = colorMode.value;
    const background = bgColor.value;
    const shape = dotShape.value;
    const useBrightnessSize = sizeByBrightness.checked;
    const dotColorCustom = customColor.value;

    const sampleWidth = originalCanvas.width;
    const sampleHeight = originalCanvas.height;
    const imageData = hiddenCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;

    const cols = Math.ceil(sampleWidth / spacing);
    const rows = Math.ceil(sampleHeight / spacing);
    const outputWidth = cols * spacing;
    const outputHeight = rows * spacing;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outputWidth} ${outputHeight}" width="${outputWidth}" height="${outputHeight}">\n`;
    svgContent += `  <rect width="100%" height="100%" fill="${background}"/>\n`;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * spacing + spacing / 2;
            const y = row * spacing + spacing / 2;

            const sampleX = Math.min(Math.floor(col * spacing), sampleWidth - 1);
            const sampleY = Math.min(Math.floor(row * spacing), sampleHeight - 1);
            const pixelIndex = (sampleY * sampleWidth + sampleX) * 4;

            const r = pixels[pixelIndex];
            const g = pixels[pixelIndex + 1];
            const b = pixels[pixelIndex + 2];
            const a = pixels[pixelIndex + 3];

            if (a < 10) continue;

            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            
            let currentDotSize = dotSize;
            if (useBrightnessSize) {
                const sizeFactor = 1 - (brightness / 255);
                currentDotSize = Math.max(1, dotSize * (0.3 + sizeFactor * 0.7));
            }

            let fillColor;
            switch (mode) {
                case 'color':
                    fillColor = `rgb(${r},${g},${b})`;
                    break;
                case 'grayscale':
                    fillColor = `rgb(${Math.round(brightness)},${Math.round(brightness)},${Math.round(brightness)})`;
                    break;
                case 'blackwhite':
                    fillColor = brightness > 128 ? '#ffffff' : '#000000';
                    break;
                case 'custom':
                    fillColor = dotColorCustom;
                    break;
                default:
                    fillColor = `rgb(${r},${g},${b})`;
            }

            const radius = currentDotSize / 2;
            
            switch (shape) {
                case 'circle':
                    svgContent += `  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${fillColor}"/>\n`;
                    break;
                case 'square':
                    svgContent += `  <rect x="${(x - radius).toFixed(1)}" y="${(y - radius).toFixed(1)}" width="${(radius * 2).toFixed(1)}" height="${(radius * 2).toFixed(1)}" fill="${fillColor}"/>\n`;
                    break;
                case 'diamond':
                    svgContent += `  <polygon points="${x},${y - radius} ${x + radius},${y} ${x},${y + radius} ${x - radius},${y}" fill="${fillColor}"/>\n`;
                    break;
            }
        }
    }

    svgContent += '</svg>';
    return svgContent;
}

function generateHTMLCode() {
    const dataUrl = dotMatrixCanvas.toDataURL('image/png');
    const width = dotMatrixCanvas.width;
    const height = dotMatrixCanvas.height;
    
    return `<!-- Dot Matrix Image -->\n<img src="${dataUrl}" alt="Dot Matrix" width="${width}" height="${height}" style="display: block; max-width: 100%; height: auto;" />`;
}

function generateDataURLCode() {
    return dotMatrixCanvas.toDataURL('image/png');
}

function copyEmbedCode() {
    const code = embedCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
        copyCodeBtn.textContent = '✓ Copied!';
        copyCodeBtn.classList.add('copied');
        setTimeout(() => {
            copyCodeBtn.textContent = '📋 Copy Code';
            copyCodeBtn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        copyCodeBtn.textContent = '✓ Copied!';
        copyCodeBtn.classList.add('copied');
        setTimeout(() => {
            copyCodeBtn.textContent = '📋 Copy Code';
            copyCodeBtn.classList.remove('copied');
        }, 2000);
    });
}

// Update generateDotMatrix to also generate embed code
const originalGenerateDotMatrix = generateDotMatrix;
window.generateDotMatrixWithEmbed = function() {
    originalGenerateDotMatrix();
    if (currentImage && !isProcessing) {
        generateEmbedCode();
    }
};

// Override the debounced generate to include embed code
const debouncedGenerateWithEmbed = debounce(() => {
    generateDotMatrix();
    if (currentImage) generateEmbedCode();
}, 50);

// Re-attach event listeners with embed code generation
dotSizeSlider.addEventListener('input', () => {
    updateSliderValues();
    if (currentImage) debouncedGenerateWithEmbed();
});

spacingSlider.addEventListener('input', () => {
    updateSliderValues();
    if (currentImage) debouncedGenerateWithEmbed();
});

// Patch handleControlChange to generate embed code
const originalHandleControlChange = handleControlChange;
window.handleControlChangePatched = function() {
    originalHandleControlChange();
    if (currentImage) generateEmbedCode();
};

colorMode.removeEventListener('change', handleColorModeChange);
colorMode.addEventListener('change', () => {
    handleColorModeChange();
    if (currentImage) generateEmbedCode();
});

customColor.removeEventListener('input', handleControlChange);
customColor.addEventListener('input', () => {
    handleControlChange();
    if (currentImage) generateEmbedCode();
});

bgColor.removeEventListener('input', handleControlChange);
bgColor.addEventListener('input', () => {
    handleControlChange();
    if (currentImage) generateEmbedCode();
});

dotShape.removeEventListener('change', handleControlChange);
dotShape.addEventListener('change', () => {
    handleControlChange();
    if (currentImage) generateEmbedCode();
});

sizeByBrightness.removeEventListener('change', handleControlChange);
sizeByBrightness.addEventListener('change', () => {
    handleControlChange();
    if (currentImage) generateEmbedCode();
});

// Patch image upload to generate embed code
const originalHandleImageUpload = handleImageUpload;
imageInput.removeEventListener('change', handleImageUpload);
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    fileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            drawOriginalImage();
            generateDotMatrix();
            generateEmbedCode();
            downloadBtn.disabled = false;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Hide embed section on reset
const originalResetAll = resetAll;
window.resetAllPatched = function() {
    originalResetAll();
    embedSection.style.display = 'none';
};

resetBtn.removeEventListener('click', resetAll);
resetBtn.addEventListener('click', () => {
    resetAll();
    embedSection.style.display = 'none';
});
