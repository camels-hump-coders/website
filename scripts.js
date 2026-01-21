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

    // UNEARTHED title mining sequence (2025-2026 page)
    const miningWord = document.querySelector('.earth-theme');
    if (miningWord) {
        const letters = Array.from(miningWord.querySelectorAll('.mined-letter'));
        const pickaxe = miningWord.querySelector('.mining-pickaxe');
        if (letters.length) {
            const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            const parseDuration = (value) => {
                const trimmed = value.trim();
                if (!trimmed) return null;
                if (trimmed.endsWith('ms')) {
                    const ms = Number.parseFloat(trimmed);
                    return Number.isFinite(ms) ? ms : null;
                }
                if (trimmed.endsWith('s')) {
                    const seconds = Number.parseFloat(trimmed);
                    return Number.isFinite(seconds) ? seconds * 1000 : null;
                }
                const fallback = Number.parseFloat(trimmed);
                return Number.isFinite(fallback) ? fallback : null;
            };
            const slotDuration = parseDuration(
                getComputedStyle(miningWord).getPropertyValue('--mine-slot-duration')
            ) || 1100;
            const resetPause = 200;
            const pickaxeAngles = [-25, 20, -85, 85, -160, 160, -5, 175, 35];
            const pickaxeScales = [0.92, 0.9, 0.85, 0.85, 0.92, 0.92, 0.88, 0.88, 0.86];
            let index = 0;
            let activeIndex = 0;
            let miningTimer = null;
            let resetTimer = null;

            const clearTimers = () => {
                if (miningTimer) {
                    window.clearTimeout(miningTimer);
                    miningTimer = null;
                }
                if (resetTimer) {
                    window.clearTimeout(resetTimer);
                    resetTimer = null;
                }
            };

            const resetLetters = () => {
                letters.forEach((letter) => {
                    letter.classList.remove('is-mining', 'is-gone');
                });
            };

            const positionPickaxe = (letter, idx) => {
                if (!pickaxe) return;
                const letterRect = letter.getBoundingClientRect();
                const containerRect = miningWord.getBoundingClientRect();
                const x = letterRect.left - containerRect.left + letterRect.width / 2;
                const y = letterRect.top - containerRect.top + letterRect.height * 0.2;
                pickaxe.style.setProperty('--pickaxe-x', `${x}px`);
                pickaxe.style.setProperty('--pickaxe-y', `${y}px`);
                pickaxe.style.setProperty('--pickaxe-rot', `${pickaxeAngles[idx % pickaxeAngles.length]}deg`);
                pickaxe.style.setProperty('--pickaxe-scale', `${pickaxeScales[idx % pickaxeScales.length]}`);
            };

            const swingPickaxe = () => {
                if (!pickaxe) return;
                pickaxe.classList.remove('is-mining');
                void pickaxe.offsetWidth;
                pickaxe.classList.add('is-mining');
            };

            const mineNext = () => {
                const letter = letters[index];
                activeIndex = index;
                positionPickaxe(letter, index);
                swingPickaxe();
                letter.classList.add('is-mining');
                miningTimer = window.setTimeout(() => {
                    letter.classList.add('is-gone');
                    letter.classList.remove('is-mining');
                    index += 1;
                    if (index >= letters.length) {
                        index = 0;
                        resetTimer = window.setTimeout(() => {
                            resetLetters();
                            mineNext();
                        }, resetPause);
                    } else {
                        mineNext();
                    }
                }, slotDuration);
            };

            const startMining = () => {
                clearTimers();
                resetLetters();
                if (pickaxe) {
                    pickaxe.classList.remove('is-mining');
                }
                if (reduceMotionQuery.matches) {
                    if (pickaxe) {
                        pickaxe.classList.add('is-hidden');
                    }
                    return;
                }
                if (pickaxe) {
                    pickaxe.classList.remove('is-hidden');
                }
                index = 0;
                activeIndex = 0;
                mineNext();
            };

            const handleResize = () => {
                if (reduceMotionQuery.matches || !pickaxe) return;
                const letter = letters[activeIndex] || letters[0];
                if (letter) {
                    positionPickaxe(letter, activeIndex);
                }
            };

            startMining();
            window.addEventListener('resize', handleResize);

            if (typeof reduceMotionQuery.addEventListener === 'function') {
                reduceMotionQuery.addEventListener('change', startMining);
            } else if (typeof reduceMotionQuery.addListener === 'function') {
                reduceMotionQuery.addListener(startMining);
            }
        }
    }

    // World Championship stats counter (donate page)
    const statsCounter = document.querySelector('.stats-counter');
    if (statsCounter) {
        const counters = Array.from(statsCounter.querySelectorAll('.stats-counter__number'));
        if (counters.length) {
            const formatter = new Intl.NumberFormat('en-US');
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const duration = 2200;
            let hasStarted = false;

            const startCounters = () => {
                if (hasStarted) return;
                hasStarted = true;

                const targets = counters.map((counter) => {
                    const rawTarget = counter.getAttribute('data-target') || '0';
                    const target = Number.parseFloat(rawTarget.replace(/[^0-9.-]/g, ''));
                    return Number.isFinite(target) && target > 0 ? target : 0;
                });

                const startTime = performance.now();
                counters.forEach((counter, index) => {
                    const target = targets[index];
                    const setFinal = () => {
                        counter.textContent = formatter.format(target);
                        counter.classList.add('stats-counter__number--done');
                        const item = counter.closest('.stats-counter__item');
                        if (item) {
                            item.classList.add('stats-counter__item--done');
                        }
                    };

                    if (prefersReducedMotion || target === 0) {
                        setFinal();
                        return;
                    }

                    const step = (now) => {
                        const progress = Math.min(1, (now - startTime) / duration);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        const value = Math.round(target * eased);
                        counter.textContent = formatter.format(value);
                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        } else {
                            setFinal();
                        }
                    };

                    counter.textContent = formatter.format(0);
                    window.requestAnimationFrame(step);
                });
            };

            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            startCounters();
                            observer.disconnect();
                        }
                    });
                }, { threshold: 0.35 });

                observer.observe(statsCounter);
            } else {
                startCounters();
            }
        }
    }
});
