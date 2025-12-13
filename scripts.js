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

    const bodyHasNoSticky = document.body.classList.contains('no-sticky-nav');
    const nav = document.querySelector('nav');

    if (nav && !bodyHasNoSticky) {
        const placeholder = document.createElement('div');
        placeholder.className = 'nav-placeholder';

        let isStuck = false;
        let navTop = nav.getBoundingClientRect().top + window.scrollY;

        const setPlaceholderHeight = () => {
            placeholder.style.height = `${nav.offsetHeight}px`;
        };

        const updateNavTop = () => {
            if (isStuck && placeholder.isConnected) {
                navTop = placeholder.getBoundingClientRect().top + window.scrollY;
            } else {
                navTop = nav.getBoundingClientRect().top + window.scrollY;
            }
        };

        const stickNav = () => {
            if (isStuck) return;
            setPlaceholderHeight();
            nav.classList.add('nav-stuck');
            nav.parentNode.insertBefore(placeholder, nav.nextElementSibling);
            isStuck = true;
        };

        const unstickNav = () => {
            if (!isStuck) return;
            nav.classList.remove('nav-stuck');
            if (placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
            isStuck = false;
            updateNavTop();
        };

        const handleScroll = () => {
            if (window.scrollY >= navTop) {
                stickNav();
            } else {
                unstickNav();
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', () => {
            setPlaceholderHeight();
            updateNavTop();
            handleScroll();
        });

        updateNavTop();
        handleScroll();
    }
});
