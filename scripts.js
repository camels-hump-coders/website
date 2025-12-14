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

    // Simple gallery carousel (used on 2024-2025 page)
    const gallery = document.querySelector('.season-gallery');
    if (gallery) {
        const track = gallery.querySelector('.gallery-track');
        const slides = Array.from(gallery.querySelectorAll('.gallery-slide'));
        const caption = gallery.querySelector('.gallery-caption');
        const prevBtn = gallery.querySelector('.gallery-prev');
        const nextBtn = gallery.querySelector('.gallery-next');
        let current = 0;
        let timer = null;

        if (slides.length && track) {
            if (slides.length === 1) {
                track.style.transform = 'translateX(0)';
                if (caption) {
                    caption.textContent = slides[0].dataset.caption || '';
                }
                return;
            }

            const firstClone = slides[0].cloneNode(true);
            const lastClone = slides[slides.length - 1].cloneNode(true);
            track.appendChild(firstClone);
            track.insertBefore(lastClone, track.firstChild);

            const total = slides.length;
            current = 1; // start at the first real slide

            const setCaption = (idx) => {
                if (!caption) return;
                const realIndex = (idx - 1 + total) % total;
                caption.textContent = slides[realIndex].dataset.caption || '';
            };

            const goTo = (idx, smooth = true) => {
                current = idx;
                track.style.transition = smooth ? 'transform 0.6s ease' : 'none';
                track.style.transform = `translateX(-${current * 100}%)`;
                setCaption(current);
            };

            const nextSlide = () => goTo(current + 1, true);

            const startTimer = () => {
                if (timer) clearInterval(timer);
                timer = setInterval(nextSlide, 8000);
            };

            const stopTimer = () => {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
            };

            track.addEventListener('transitionend', () => {
                if (current === 0) {
                    goTo(total, false);
                } else if (current === total + 1) {
                    goTo(1, false);
                }
            });

            gallery.addEventListener('mouseenter', stopTimer);
            gallery.addEventListener('mouseleave', startTimer);

            prevBtn?.addEventListener('click', () => {
                stopTimer();
                goTo(current - 1, true);
                startTimer();
            });

            nextBtn?.addEventListener('click', () => {
                stopTimer();
                nextSlide();
                startTimer();
            });

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    stopTimer();
                } else {
                    startTimer();
                }
            });

            // Initialize position and caption, then start autoplay
            goTo(current, false);
            startTimer();
        }
    }
});
