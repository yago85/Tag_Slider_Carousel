document.addEventListener("DOMContentLoaded", () => {
    const sliders = document.querySelectorAll(".wpui-tags-slider-container");

    sliders.forEach((slider) => {
        // Getting the main slider elements for further manipulation
        const track = slider.querySelector(".wpui-tags-track"), // The track along which elements (tags) will move
            nextBtn = slider.querySelector(".btn-next"), // Button for scrolling forward
            prevBtn = slider.querySelector(".btn-prev"), // Button for scrolling backward
            leftOverlay = slider.querySelector(".wpui-left-overlay"), // Left overlay area for hiding elements
            rightOverlay = slider.querySelector(".wpui-right-overlay"), // Right overlay area for hiding elements

            // Settings for automatic scrolling
            autoScrollSettings = {
                enabled: true, // Enable or disable auto-scrolling
                direction: -1, // Scroll direction (-1 for backward, 1 for forward)
                mode: "infinite", // Scroll mode: "infinite" for endless scrolling, "single" for one-time scrolling in both directions
                speed: 2000, // Scroll speed (delay between scrolls)
                interval: null, // Reference to the auto-scroll interval (for stopping it)
                isScrolling: true, // Flag indicating whether scrolling is currently happening
                userInteracted: false // Flag indicating user interaction with the slider
            };

        // Variables for controlling scrolling
        let currentTransX = 0, // Current X-axis offset
            targetTransX = 0, // Target X-axis offset for smooth scrolling
            animFrame, // Animation frame ID for smooth movement
            hasReachedEnd = false; // Flag indicating whether the end of the track has been reached in "single" mode

        function startAutoScroll() {
            if (!autoScrollSettings.enabled || autoScrollSettings.userInteracted || !autoScrollSettings.isScrolling) return;
            autoScrollSettings.interval = setInterval(() => {
                const maxScroll = -(track.scrollWidth - track.parentElement.clientWidth);
                adjustAutoScrollDirection(maxScroll);
                if (autoScrollSettings.isScrolling) moveSlider(autoScrollSettings.direction);
                else clearInterval(autoScrollSettings.interval);
            }, autoScrollSettings.speed);
        }

        function adjustAutoScrollDirection(maxScroll) {
            // Logic for reversing direction or stopping scrolling
            if ((currentTransX <= maxScroll && autoScrollSettings.direction === -1) || (currentTransX >= 0 && autoScrollSettings.direction === 1)) {
                if (autoScrollSettings.mode === "single" && hasReachedEnd) {
                    autoScrollSettings.isScrolling = false;
                    clearInterval(autoScrollSettings.interval);
                } else {
                    autoScrollSettings.direction *= -1;
                    if (autoScrollSettings.mode === "single") hasReachedEnd = true;
                }
            }
        }

        function stopAutoScrollOnInteraction() {
            // Stop auto-scrolling when the user interacts with the slider
            ['click', 'touchstart', 'mouseenter'].forEach(event => {
                slider.addEventListener(event, () => {
                    clearInterval(autoScrollSettings.interval);
                    autoScrollSettings.userInteracted = true;
                }, {once: true});
            });
        }

        function updateSliderPosition(transX) {
            // Update slider position considering maximum and minimum scroll values
            const maxScroll = -(track.scrollWidth - track.parentElement.clientWidth);
            currentTransX = Math.max(maxScroll, Math.min(0, transX));
            track.style.transform = `translateX(${currentTransX}px)`;
            updateActionButtonsVisibility();
        }

        function updateSliderOnResize() {
            updateSliderPosition(currentTransX);
        }

        window.addEventListener('resize', updateSliderOnResize);

        function smoothlyMoveSlider() {
            // Smoothly move the slider to the target position
            if (animFrame) cancelAnimationFrame(animFrame);
            const duration = 1000; // Время, за которое происходит перемещение (в миллисекундах)
            const startTime = performance.now();
            const startPosition = currentTransX;

            function animate(currentTime) {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1); // Прогресс анимации (от 0 до 1)
                const easedProgress = 1 - Math.pow(1 - progress, 3); // Используйте для плавного замедления
                const nextPosition = startPosition + (targetTransX - startPosition) * easedProgress;
                updateSliderPosition(nextPosition);

                if (progress < 1) {
                    animFrame = requestAnimationFrame(animate);
                }
            }
            animFrame = requestAnimationFrame(animate);
        }

        function moveSlider(direction, isWheel = false) {
            // Calculate the new target position and initiate smooth movement
            const stepSize = isWheel ? 10 : Math.max(100, (track.scrollWidth - track.parentElement.clientWidth) / 4);
            let newTarget = targetTransX + stepSize * direction;
            const maxScroll = -(track.scrollWidth - track.parentElement.clientWidth);
            newTarget = Math.max(maxScroll, Math.min(0, newTarget));
            if (newTarget !== targetTransX) {
                targetTransX = newTarget;
                smoothlyMoveSlider();
            }
        }

        function updateActionButtonsVisibility() {
            // Update visibility of buttons based on the current slider position
            const maxScroll = track.scrollWidth - track.parentElement.clientWidth;
            const isAtStart = currentTransX >= 0;
            const isAtEnd = Math.abs(currentTransX) >= maxScroll;
            [prevBtn, leftOverlay].forEach(el => el.classList.toggle("wpui-hide", isAtStart));
            [nextBtn, rightOverlay].forEach(el => el.classList.toggle("wpui-hide", isAtEnd));
        }

        [nextBtn, prevBtn].forEach(btn => btn.addEventListener("click", (e) => moveSlider(btn === prevBtn ? 1 : -1)));

        // Initialize touch and wheel events
        handleTouchAndWheelEvents(track, updateSliderPosition, moveSlider, () => currentTransX);

        // Handle clicks on tags inside the track
        const tags = track.querySelectorAll(".wpui-tag");
        tags.forEach(tag => tag.addEventListener("click", () => {
            tags.forEach(t => t.classList.remove("active"));
            tag.classList.add("active");
        }));

        startAutoScroll();
        stopAutoScrollOnInteraction();
        updateActionButtonsVisibility();
    });
});

function handleTouchAndWheelEvents(track, updatePosition, moveSlider, getCurrentTransX) {
    // Register touch and wheel events for manual slider control
    let startX = 0;
    let startTransX = 0;

    track.addEventListener('touchstart', e => {
        startX = e.touches[0].pageX;
        startTransX = getCurrentTransX();
        track.style.transition = 'none';
    }, {passive: true});

    track.addEventListener('touchmove', e => {
        let currentX = e.touches[0].pageX;
        let diffX = currentX - startX;
        updatePosition(startTransX + diffX);
    }, {passive: true});

    track.addEventListener('touchend', () => track.style.transition = '');

    track.addEventListener('wheel', e => {
        e.preventDefault();
        let direction = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? (e.deltaX > 0 ? -1 : 1) : (e.deltaY > 0 ? -1 : 1);
        moveSlider(direction, true);
    }, {passive: false});
}
