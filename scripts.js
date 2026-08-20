document.addEventListener('DOMContentLoaded', () => {
    const PASSWORD = '1108';
    const SECRET_PAGE = 'secret-games.html';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const currentSlug = currentPage.replace(/\.html$/, '');
    const seasonPages = new Set(['2023-2024', '2024-2025', '2025-2026', '2026-2027']);
    const isSeasonPage = document.body.classList.contains('season-theme') || seasonPages.has(currentSlug);

    if (!isSeasonPage) {
        document.body.classList.add('bio-theme');
    }

    if (currentPage !== '2025-2026.html') {
        const siteLogo = document.querySelector('.site-logo');
        if (siteLogo && !document.querySelector('.bio-buzz-header-logo')) {
            const bioBuzzLogo = document.createElement('img');
            bioBuzzLogo.className = 'bio-buzz-header-logo';
            bioBuzzLogo.src = 'assets/biobuzz-hero-transparent.png';
            bioBuzzLogo.alt = 'BioBuzz moving logo';
            siteLogo.insertAdjacentElement('afterend', bioBuzzLogo);
        }
    }

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

    const beeScene = document.querySelector('.bio-theme-graphics');
    const hiveEntrance = beeScene?.querySelector('.hive-entrance');
    if (beeScene && hiveEntrance) {
        const flightConfigs = [
            {
                bee: beeScene.querySelector('.bee--one'),
                flower: beeScene.querySelector('.flower-patch--far .flower--two .flower-bloom'),
                duration: 5200,
                rest: 1900,
                hiveRest: 850,
                delay: 0,
                lift: 0.58,
                controlOne: 0.18,
                controlTwo: 0.76,
                edgeRoute: true
            },
            {
                bee: beeScene.querySelector('.bee--two'),
                flower: beeScene.querySelector('.flower-patch--far .flower--four .flower-bloom'),
                duration: 4800,
                rest: 2200,
                hiveRest: 1100,
                delay: 1300,
                lift: 0.44,
                controlOne: 0.25,
                controlTwo: 0.82,
                edgeRoute: true
            },
            {
                bee: beeScene.querySelector('.bee--three'),
                flower: beeScene.querySelector('.flower-patch--near .flower--three .flower-bloom'),
                duration: 3900,
                rest: 1700,
                hiveRest: 700,
                delay: 2500,
                lift: 0.11,
                controlOne: 0.2,
                controlTwo: 0.72
            }
        ].filter(({ bee, flower }) => bee && flower);

        if (flightConfigs.length) {
            const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            const activeAnimations = new Set();
            let flightRun = 0;
            let resizeTimer = null;

            const wait = (duration) => new Promise((resolve) => {
                window.setTimeout(resolve, duration);
            });

            const pointAtCenter = (element) => {
                const sceneRect = beeScene.getBoundingClientRect();
                const rect = element.getBoundingClientRect();
                return {
                    x: rect.left - sceneRect.left + rect.width / 2,
                    y: rect.top - sceneRect.top + rect.height / 2
                };
            };

            const pointOnFlower = (flower, bee) => {
                const sceneRect = beeScene.getBoundingClientRect();
                const flowerRect = flower.getBoundingClientRect();
                const size = Number.parseFloat(
                    getComputedStyle(bee).getPropertyValue('--bee-size')
                ) || 1;
                const beeHeight = bee.offsetHeight * size;
                return {
                    x: flowerRect.left - sceneRect.left + flowerRect.width / 2,
                    y: flowerRect.top - sceneRect.top + flowerRect.height * 0.52 - beeHeight * 0.38
                };
            };

            const cubicPoint = (start, controlOne, controlTwo, end, progress) => {
                const inverse = 1 - progress;
                return {
                    x: inverse ** 3 * start.x
                        + 3 * inverse ** 2 * progress * controlOne.x
                        + 3 * inverse * progress ** 2 * controlTwo.x
                        + progress ** 3 * end.x,
                    y: inverse ** 3 * start.y
                        + 3 * inverse ** 2 * progress * controlOne.y
                        + 3 * inverse * progress ** 2 * controlTwo.y
                        + progress ** 3 * end.y
                };
            };

            const cubicTangent = (start, controlOne, controlTwo, end, progress) => {
                const inverse = 1 - progress;
                return {
                    x: 3 * inverse ** 2 * (controlOne.x - start.x)
                        + 6 * inverse * progress * (controlTwo.x - controlOne.x)
                        + 3 * progress ** 2 * (end.x - controlTwo.x),
                    y: 3 * inverse ** 2 * (controlOne.y - start.y)
                        + 6 * inverse * progress * (controlTwo.y - controlOne.y)
                        + 3 * progress ** 2 * (end.y - controlTwo.y)
                };
            };

            const beeTransform = (bee, point, tangent, flightScale) => {
                const movingRight = tangent.x >= 0;
                const rawAngle = movingRight
                    ? Math.atan2(tangent.y, Math.max(tangent.x, 0.01)) * 180 / Math.PI
                    : -Math.atan2(tangent.y, Math.max(-tangent.x, 0.01)) * 180 / Math.PI;
                const angle = Math.max(-32, Math.min(32, rawAngle));
                const facing = movingRight ? 1 : -1;
                const size = Number.parseFloat(
                    getComputedStyle(bee).getPropertyValue('--bee-size')
                ) || 1;
                return `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${angle}deg) scaleX(${facing}) scale(${flightScale * size})`;
            };

            const buildFlightFrames = (start, end, config, enteringHive) => {
                const sceneRect = beeScene.getBoundingClientRect();
                const sceneHeight = sceneRect.height;
                const lift = sceneHeight * config.lift;
                const distanceX = end.x - start.x;
                const controlOne = {
                    x: start.x + distanceX * config.controlOne,
                    y: start.y - lift * (enteringHive ? 0.82 : 0.68)
                };
                const controlTwo = {
                    x: start.x + distanceX * config.controlTwo,
                    y: end.y - lift * (enteringHive ? 0.58 : 1)
                };
                if (sceneRect.width <= 640 && config.edgeRoute) {
                    controlOne.x = enteringHive ? sceneRect.width * 1.1 : sceneRect.width * -0.1;
                    controlTwo.x = enteringHive ? sceneRect.width * -0.1 : sceneRect.width * 1.1;
                }
                const steps = 42;
                const frames = [];

                for (let step = 0; step <= steps; step += 1) {
                    const progress = step / steps;
                    const point = cubicPoint(start, controlOne, controlTwo, end, progress);
                    const tangent = cubicTangent(start, controlOne, controlTwo, end, progress);
                    const edgeProgress = enteringHive
                        ? Math.max(0, (progress - 0.82) / 0.18)
                        : Math.min(1, progress / 0.13);
                    const opacity = enteringHive ? 1 - edgeProgress : edgeProgress;
                    const flightScale = 0.18 + 0.82 * (enteringHive ? 1 - edgeProgress : edgeProgress);
                    frames.push({
                        offset: progress,
                        opacity,
                        transform: beeTransform(config.bee, point, tangent, flightScale)
                    });
                }

                return frames;
            };

            const fly = async (bee, start, end, config, enteringHive, run) => {
                const previousAnimation = bee.flightAnimation;
                const animation = bee.animate(
                    buildFlightFrames(start, end, config, enteringHive),
                    { duration: config.duration, easing: 'linear', fill: 'forwards' }
                );
                bee.flightAnimation = animation;
                activeAnimations.add(animation);
                previousAnimation?.cancel();

                try {
                    await animation.finished;
                    return run === flightRun;
                } catch {
                    return false;
                } finally {
                    activeAnimations.delete(animation);
                }
            };

            const runBee = async (config, run) => {
                await wait(config.delay);
                while (run === flightRun && !reduceMotionQuery.matches) {
                    config.bee.classList.remove('is-resting');
                    const leftHive = await fly(
                        config.bee,
                        pointAtCenter(hiveEntrance),
                        pointOnFlower(config.flower, config.bee),
                        config,
                        false,
                        run
                    );
                    if (!leftHive || run !== flightRun) return;

                    config.bee.classList.add('is-resting');
                    await wait(config.rest);
                    if (run !== flightRun) return;

                    config.bee.classList.remove('is-resting');
                    const enteredHive = await fly(
                        config.bee,
                        pointOnFlower(config.flower, config.bee),
                        pointAtCenter(hiveEntrance),
                        config,
                        true,
                        run
                    );
                    if (!enteredHive || run !== flightRun) return;

                    await wait(config.hiveRest);
                }
            };

            const showReducedMotionScene = () => {
                flightConfigs.forEach((config) => {
                    const point = pointOnFlower(config.flower, config.bee);
                    config.bee.style.opacity = '1';
                    config.bee.style.transform = beeTransform(config.bee, point, { x: 1, y: 0 }, 1);
                    config.bee.classList.add('is-resting');
                });
            };

            const startBeeFlights = () => {
                flightRun += 1;
                const run = flightRun;
                activeAnimations.forEach((animation) => animation.cancel());
                activeAnimations.clear();
                beeScene.classList.add('bee-flight-ready');

                flightConfigs.forEach((config) => {
                    config.bee.flightAnimation = null;
                    config.bee.classList.remove('is-resting');
                    config.bee.style.opacity = '0';
                    config.bee.style.transform = 'none';
                });

                if (reduceMotionQuery.matches) {
                    showReducedMotionScene();
                    return;
                }

                flightConfigs.forEach((config) => {
                    runBee(config, run);
                });
            };

            window.addEventListener('resize', () => {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(startBeeFlights, 180);
            });

            if (typeof reduceMotionQuery.addEventListener === 'function') {
                reduceMotionQuery.addEventListener('change', startBeeFlights);
            } else if (typeof reduceMotionQuery.addListener === 'function') {
                reduceMotionQuery.addListener(startBeeFlights);
            }

            startBeeFlights();
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
