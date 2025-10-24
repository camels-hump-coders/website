document.addEventListener('DOMContentLoaded', () => {
    const PASSWORD = '1108';
    const SECRET_PAGE = 'secret-games.html';

    const gearButton = document.createElement('button');
    gearButton.type = 'button';
    gearButton.className = 'settings-gear';
    gearButton.setAttribute('aria-label', 'Settings');
    gearButton.innerHTML = '&#9881;';
    document.body.appendChild(gearButton);

    gearButton.addEventListener('click', () => {
        const attempt = window.prompt('Unlock to view');
        if (attempt === null) {
            return;
        }
        if (attempt === PASSWORD) {
            window.location.href = SECRET_PAGE;
        } else {
            window.alert('Incorrect password. Please try again.');
        }
    });
});
