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

    const projectCarousel = document.querySelector('.project-carousel');
    if (projectCarousel) {
        const viewport = projectCarousel.querySelector('.project-carousel__viewport');
        const track = projectCarousel.querySelector('.project-carousel__track');
        const slides = Array.from(projectCarousel.querySelectorAll('.project-carousel__slide'));
        const previousButton = projectCarousel.querySelector('.project-carousel__arrow--previous');
        const nextButton = projectCarousel.querySelector('.project-carousel__arrow--next');
        const status = projectCarousel.querySelector('.project-carousel__status');
        let currentSlide = 0;
        let touchStartX = null;
        let isAnimating = false;
        let animationTimer = null;

        const normalizeSlide = (index) => (
            (index + slides.length) % slides.length
        );

        const updateDimensions = () => {
            if (!viewport || !track || !slides.length) return;
            const styles = getComputedStyle(projectCarousel);
            const gap = Number.parseFloat(styles.getPropertyValue('--slide-gap')) || 0;
            const slideWidth = slides[0].offsetWidth;
            const trackHeight = Math.max(...slides.map((slide) => slide.offsetHeight));
            projectCarousel.style.setProperty('--slide-step', `${slideWidth + gap}px`);
            projectCarousel.style.setProperty(
                '--active-offset',
                `${(viewport.clientWidth - slideWidth) / 2}px`
            );
            track.style.height = `${trackHeight}px`;
        };

        const updateSlideStates = () => {
            const nextSlide = normalizeSlide(currentSlide + 1);
            const previousSlide = normalizeSlide(currentSlide - 1);

            slides.forEach((slide, slideIndex) => {
                const isCurrent = slideIndex === currentSlide;
                const isNext = slideIndex === nextSlide;
                const isPrevious = slideIndex === previousSlide;
                slide.classList.toggle('is-active', isCurrent);
                slide.classList.toggle('is-next', isNext);
                slide.classList.toggle('is-previous', isPrevious);
                slide.toggleAttribute('aria-current', isCurrent);
                slide.setAttribute('aria-hidden', String(!isCurrent && !isNext && !isPrevious));

                const selectButton = slide.querySelector('.project-carousel__select');
                if (selectButton) {
                    const isPreview = isNext || isPrevious;
                    selectButton.tabIndex = isPreview ? 0 : -1;
                    selectButton.setAttribute('aria-hidden', String(!isPreview));
                }

                slide.querySelectorAll('video, iframe').forEach((media) => {
                    if (isCurrent) {
                        media.removeAttribute('tabindex');
                    } else {
                        media.setAttribute('tabindex', '-1');
                    }
                });

                if (!isCurrent) {
                    slide.querySelector('video')?.pause();
                }
            });

            if (status) {
                status.textContent = `Showing slide ${currentSlide + 1} of ${slides.length}`;
            }
        };

        const showSlide = (index) => {
            if (!viewport || !track || !slides.length) return;
            const targetSlide = normalizeSlide(index);
            if (targetSlide === currentSlide) {
                updateDimensions();
                return;
            }
            if (isAnimating) return;

            viewport.scrollLeft = 0;
            const oldSlide = currentSlide;
            const movingForward = targetSlide === normalizeSlide(oldSlide + 1);
            const wrappingSlide = slides[
                movingForward
                    ? normalizeSlide(oldSlide - 1)
                    : normalizeSlide(oldSlide + 1)
            ];

            wrappingSlide.classList.add('is-jumping');
            wrappingSlide.getBoundingClientRect();
            currentSlide = targetSlide;
            updateSlideStates();
            wrappingSlide.getBoundingClientRect();
            requestAnimationFrame(() => wrappingSlide.classList.remove('is-jumping'));

            isAnimating = true;
            window.clearTimeout(animationTimer);
            animationTimer = window.setTimeout(() => {
                isAnimating = false;
            }, 575);
        };

        previousButton?.addEventListener('click', () => showSlide(currentSlide - 1));
        nextButton?.addEventListener('click', () => showSlide(currentSlide + 1));
        slides.forEach((slide, slideIndex) => {
            slide.querySelector('.project-carousel__select')?.addEventListener('click', () => {
                showSlide(slideIndex);
            });
        });

        projectCarousel.tabIndex = 0;
        projectCarousel.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                showSlide(currentSlide - 1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                showSlide(currentSlide + 1);
            }
        });

        projectCarousel.addEventListener('touchstart', (event) => {
            touchStartX = event.changedTouches[0]?.clientX ?? null;
        }, { passive: true });

        projectCarousel.addEventListener('touchend', (event) => {
            if (touchStartX === null) return;
            const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
            const distance = touchEndX - touchStartX;
            touchStartX = null;
            if (Math.abs(distance) < 50) return;
            showSlide(currentSlide + (distance < 0 ? 1 : -1));
        }, { passive: true });

        const refreshLayout = () => {
            slides.forEach((slide) => slide.classList.add('is-jumping'));
            updateDimensions();
            track?.getBoundingClientRect();
            requestAnimationFrame(() => {
                slides.forEach((slide) => slide.classList.remove('is-jumping'));
            });
        };

        updateSlideStates();
        refreshLayout();
        window.addEventListener('resize', refreshLayout);
        window.addEventListener('load', refreshLayout, { once: true });
        document.fonts?.ready.then(refreshLayout);
    }

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

    // Home page Great Moments gallery
    document.querySelectorAll('.moments-gallery').forEach((momentsGallery) => {
        const track = momentsGallery.querySelector('.moments-track');
        const slides = Array.from(momentsGallery.querySelectorAll('.moments-slide'));
        const caption = momentsGallery.querySelector('.moments-caption');
        const previousButton = momentsGallery.querySelector('.moments-control--previous');
        const nextButton = momentsGallery.querySelector('.moments-control--next');

        if (!track || !slides.length || !previousButton || !nextButton) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const firstClone = slides[0].cloneNode(true);
        const lastClone = slides[slides.length - 1].cloneNode(true);
        let current = 1;
        let timer = null;

        firstClone.setAttribute('aria-hidden', 'true');
        lastClone.setAttribute('aria-hidden', 'true');
        track.appendChild(firstClone);
        track.insertBefore(lastClone, track.firstChild);

        const setCaption = (index) => {
            if (!caption) return;
            const realIndex = (index - 1 + slides.length) % slides.length;
            caption.textContent = slides[realIndex].dataset.caption || '';
        };

        const goTo = (index, smooth = true) => {
            current = index;
            track.style.transition = smooth && !reduceMotion.matches ? 'transform 0.6s ease' : 'none';
            track.style.transform = `translateX(-${current * 100}%)`;
            setCaption(current);
        };

        const stopTimer = () => {
            if (timer) {
                window.clearInterval(timer);
                timer = null;
            }
        };

        const startTimer = () => {
            stopTimer();
            if (!reduceMotion.matches) {
                timer = window.setInterval(() => goTo(current + 1), 5000);
            }
        };

        track.addEventListener('transitionend', () => {
            if (current === 0) {
                goTo(slides.length, false);
            } else if (current === slides.length + 1) {
                goTo(1, false);
            }
        });

        previousButton.addEventListener('click', () => {
            stopTimer();
            goTo(current - 1);
            startTimer();
        });

        nextButton.addEventListener('click', () => {
            stopTimer();
            goTo(current + 1);
            startTimer();
        });

        momentsGallery.addEventListener('mouseenter', stopTimer);
        momentsGallery.addEventListener('mouseleave', startTimer);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopTimer();
            } else {
                startTimer();
            }
        });

        goTo(current, false);
        startTimer();
    });

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
        const funnyBee = beeScene.querySelector('.bee--funny');
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
                flower: beeScene.querySelector('.flower-patch--far .flower--one .flower-bloom'),
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
                controlTwo: 0.72,
                groundRoute: true
            }
        ].filter(({ bee, flower }) => bee && flower);
        const animatedBees = [
            ...flightConfigs.map(({ bee }) => bee),
            funnyBee
        ].filter(Boolean);

        if (animatedBees.length) {
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
                let segments = [{ start, controlOne, controlTwo, end }];
                let segmentBreaks = [0, 1];

                if (sceneRect.width <= 640 && config.groundRoute) {
                    const size = Number.parseFloat(
                        getComputedStyle(config.bee).getPropertyValue('--bee-size')
                    ) || 1;
                    const beeHeight = config.bee.offsetHeight * size;
                    const groundY = Math.min(
                        sceneHeight - beeHeight / 2 - 5,
                        Math.max(start.y, end.y) + 14
                    );
                    controlOne.y = groundY;
                    controlTwo.y = groundY;
                }

                if (sceneRect.width <= 640 && config.edgeRoute) {
                    const subtitle = document.querySelector('.season-header .container p');
                    const textRange = document.createRange();
                    textRange.selectNodeContents(subtitle);
                    const textRect = textRange.getBoundingClientRect();
                    const size = Number.parseFloat(
                        getComputedStyle(config.bee).getPropertyValue('--bee-size')
                    ) || 1;
                    const beeWidth = config.bee.offsetWidth * size;
                    const leftGate = textRect.left - sceneRect.left - beeWidth / 2 - 8;
                    const rightGate = textRect.right - sceneRect.left + beeWidth / 2 + 8;
                    const aboveText = textRect.top - sceneRect.top - beeWidth * 0.85;
                    const belowText = textRect.bottom - sceneRect.top + beeWidth * 1.1;
                    const firstGate = enteringHive ? rightGate : leftGate;
                    const secondGate = enteringHive ? leftGate : rightGate;
                    const firstBelow = { x: firstGate, y: belowText };
                    const firstAbove = { x: firstGate, y: aboveText };
                    const secondAbove = { x: secondGate, y: aboveText };
                    const secondBelow = { x: secondGate, y: belowText };

                    segments = [
                        {
                            start,
                            controlOne: { x: start.x, y: belowText },
                            controlTwo: { x: firstGate, y: belowText },
                            end: firstBelow
                        },
                        {
                            start: firstBelow,
                            controlOne: { x: firstGate, y: belowText },
                            controlTwo: { x: firstGate, y: aboveText },
                            end: firstAbove
                        },
                        {
                            start: firstAbove,
                            controlOne: { x: sceneRect.width * 0.2, y: aboveText - lift * 0.72 },
                            controlTwo: { x: sceneRect.width * 0.8, y: aboveText - lift * 0.72 },
                            end: secondAbove
                        },
                        {
                            start: secondAbove,
                            controlOne: { x: secondGate, y: aboveText },
                            controlTwo: { x: secondGate, y: belowText },
                            end: secondBelow
                        },
                        {
                            start: secondBelow,
                            controlOne: { x: secondGate, y: belowText },
                            controlTwo: { x: end.x, y: belowText },
                            end
                        }
                    ];
                    segmentBreaks = [0, 0.14, 0.25, 0.75, 0.86, 1];
                }
                const steps = 60;
                const frames = [];

                for (let step = 0; step <= steps; step += 1) {
                    const progress = step / steps;
                    let segmentIndex = segments.length - 1;
                    for (let index = 0; index < segments.length; index += 1) {
                        if (progress <= segmentBreaks[index + 1]) {
                            segmentIndex = index;
                            break;
                        }
                    }
                    const segment = segments[segmentIndex];
                    const segmentStart = segmentBreaks[segmentIndex];
                    const segmentEnd = segmentBreaks[segmentIndex + 1];
                    const segmentProgress = (progress - segmentStart) / (segmentEnd - segmentStart);
                    const point = cubicPoint(
                        segment.start,
                        segment.controlOne,
                        segment.controlTwo,
                        segment.end,
                        segmentProgress
                    );
                    const tangent = cubicTangent(
                        segment.start,
                        segment.controlOne,
                        segment.controlTwo,
                        segment.end,
                        segmentProgress
                    );
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

            const buildFunnyFlightFrames = () => {
                const sceneRect = beeScene.getBoundingClientRect();
                const entrance = pointAtCenter(hiveEntrance);
                const center = {
                    x: sceneRect.width * 0.55,
                    y: sceneRect.height * 0.39
                };
                const radiusX = sceneRect.width * 0.32;
                const radiusY = sceneRect.height * 0.22;
                const startAngle = Math.PI * 0.75;
                const loopStart = {
                    x: center.x + Math.cos(startAngle) * radiusX,
                    y: center.y + Math.sin(startAngle) * radiusY
                };
                const exitControlOne = {
                    x: entrance.x + sceneRect.width * 0.05,
                    y: entrance.y - sceneRect.height * 0.02
                };
                const exitControlTwo = {
                    x: loopStart.x + sceneRect.width * 0.06,
                    y: loopStart.y + sceneRect.height * 0.14
                };
                const returnControlOne = {
                    x: loopStart.x - sceneRect.width * 0.08,
                    y: loopStart.y - sceneRect.height * 0.13
                };
                const returnControlTwo = {
                    x: entrance.x + sceneRect.width * 0.08,
                    y: entrance.y - sceneRect.height * 0.16
                };
                const steps = 120;
                const frames = [];

                for (let step = 0; step <= steps; step += 1) {
                    const progress = step / steps;
                    let point;
                    let tangent;
                    let opacity = 1;
                    let flightScale = 1;

                    if (progress <= 0.18) {
                        const routeProgress = progress / 0.18;
                        point = cubicPoint(
                            entrance,
                            exitControlOne,
                            exitControlTwo,
                            loopStart,
                            routeProgress
                        );
                        tangent = cubicTangent(
                            entrance,
                            exitControlOne,
                            exitControlTwo,
                            loopStart,
                            routeProgress
                        );
                        const emergeProgress = Math.min(1, routeProgress / 0.32);
                        opacity = emergeProgress;
                        flightScale = 0.18 + emergeProgress * 0.82;
                    } else if (progress <= 0.8) {
                        const loopProgress = (progress - 0.18) / 0.62;
                        const angle = startAngle + loopProgress * Math.PI * 4;
                        point = {
                            x: center.x + Math.cos(angle) * radiusX,
                            y: center.y + Math.sin(angle) * radiusY + Math.sin(angle * 3) * 5
                        };
                        tangent = {
                            x: -Math.sin(angle) * radiusX,
                            y: Math.cos(angle) * radiusY
                        };
                    } else {
                        const routeProgress = (progress - 0.8) / 0.2;
                        point = cubicPoint(
                            loopStart,
                            returnControlOne,
                            returnControlTwo,
                            entrance,
                            routeProgress
                        );
                        tangent = cubicTangent(
                            loopStart,
                            returnControlOne,
                            returnControlTwo,
                            entrance,
                            routeProgress
                        );
                        const enterProgress = Math.max(0, (routeProgress - 0.72) / 0.28);
                        opacity = 1 - enterProgress;
                        flightScale = 1 - enterProgress * 0.82;
                    }

                    frames.push({
                        offset: progress,
                        opacity,
                        transform: beeTransform(funnyBee, point, tangent, flightScale)
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

            const runFunnyBee = async (run) => {
                if (!funnyBee) return;
                await wait(1800);
                while (run === flightRun && !reduceMotionQuery.matches) {
                    const previousAnimation = funnyBee.flightAnimation;
                    const animation = funnyBee.animate(
                        buildFunnyFlightFrames(),
                        { duration: 32000, easing: 'linear', fill: 'forwards' }
                    );
                    funnyBee.flightAnimation = animation;
                    activeAnimations.add(animation);
                    previousAnimation?.cancel();

                    try {
                        await animation.finished;
                    } catch {
                        return;
                    } finally {
                        activeAnimations.delete(animation);
                    }

                    if (run !== flightRun) return;
                    await wait(3500);
                }
            };

            const showReducedMotionScene = () => {
                flightConfigs.forEach((config) => {
                    const point = pointOnFlower(config.flower, config.bee);
                    config.bee.style.opacity = '1';
                    config.bee.style.transform = beeTransform(config.bee, point, { x: 1, y: 0 }, 1);
                    config.bee.classList.add('is-resting');
                });
                if (funnyBee) {
                    const point = pointAtCenter(hiveEntrance);
                    point.y -= funnyBee.offsetHeight * 0.55;
                    funnyBee.style.opacity = '1';
                    funnyBee.style.transform = beeTransform(funnyBee, point, { x: 1, y: 0 }, 1);
                    funnyBee.classList.add('is-resting');
                }
            };

            const startBeeFlights = () => {
                flightRun += 1;
                const run = flightRun;
                activeAnimations.forEach((animation) => animation.cancel());
                activeAnimations.clear();
                beeScene.classList.add('bee-flight-ready');

                animatedBees.forEach((bee) => {
                    bee.flightAnimation = null;
                    bee.classList.remove('is-resting');
                    bee.style.opacity = '0';
                    bee.style.transform = 'none';
                });

                if (reduceMotionQuery.matches) {
                    showReducedMotionScene();
                    return;
                }

                flightConfigs.forEach((config) => {
                    runBee(config, run);
                });
                runFunnyBee(run);
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
