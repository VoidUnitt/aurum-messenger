console.log('🌟 Aurum Messenger запущен!');
console.log('Добро пожаловать в золотой стандарт общения');

window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Aurum готов к работе!');
    
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.6s ease-out';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
    }
});

// Добавляем эффект при наведении
const style = document.createElement('style');
style.textContent = `
    .container:hover {
        transform: translateY(-5px);
        transition: transform 0.3s ease;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    }
`;
document.head.appendChild(style);
