const styles = `
.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 9999;
}
.toast {
    background: linear-gradient(135deg, #1b263b, #0d1b2a);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 250px;
    border: 1px solid rgba(255,255,255,0.1);
    transform: translateX(120%);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.toast.show {
    transform: translateX(0);
}
.toast-icon {
    font-size: 20px;
}
.toast-content {
    flex: 1;
}
.toast-title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 4px;
}
.toast-msg {
    font-size: 12px;
    color: #a0aabf;
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const container = document.createElement('div');
container.className = 'toast-container';
document.body.appendChild(container);

export function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;

    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
