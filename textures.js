// textures.js
function createTexture(type) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (type === "floor") {
        // Текстура пола (имитация бетона)
        ctx.fillStyle = "#666";
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(
                Math.random() * 256,
                Math.random() * 256,
                Math.random() * 10,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    } else if (type === "wall") {
        // Текстура стены (имитация кирпича)
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 2;
        for (let y = 0; y < 256; y += 32) {
            for (let x = 0; x < 256; x += 64) {
                ctx.strokeRect(x + (y % 64 === 0 ? 0 : 32), y, 64, 32);
            }
        }
    } else if (type === "crate") {
        // Текстура ящика (имитация дерева)
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 4;
        for (let i = 0; i < 256; i += 32) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(256, i);
            ctx.stroke();
        }
    }

    return canvas.toDataURL("image/png");
}

const floorTexture = createTexture("floor");
const wallTexture = createTexture("wall");
const crateTexture = createTexture("crate");
